import * as express from 'express';
import {
  RosaeContext,
  RenderedBundle,
  RenderOptions,
  RosaeContextsManager,
  S3RosaeContextsManager,
  S3Conf,
  DiskRosaeContextsManager,
  RosaeContextsManagerParams,
  MemoryRosaeContextsManager,
} from 'rosaenlg-server-toolkit';
import { RosaeNlgFeatures } from 'rosaenlg-packager';

import winston = require('winston');
import { performance } from 'perf_hooks';
import CloudWatchTransport = require('winston-aws-cloudwatch');
import { createHash } from 'crypto';
import { compileFileClient, getRosaeNlgVersion, NlgLib } from 'rosaenlg';

interface RenderResponseAbstract {
  renderedText: string;
  renderOptions: RenderOptions;
  ms: number;
}

interface DirectRenderResponse extends RenderResponseAbstract {
  status: 'EXISTED' | 'CREATED';
}

interface ClassicRenderResponse extends RenderResponseAbstract {
  templateId: string;
}

interface CloudWatchParams {
  logGroupName: string | undefined;
  logStreamName: string | undefined;
  accessKeyId: string | undefined;
  secretAccessKey: string | undefined;
  region: string | undefined;
}

interface Behavior {
  lazyStartup: boolean;
  forgetTemplates: boolean;
  cacheTtl?: number;
  checkPeriod?: number;
}

export interface ServerParams {
  templatesPath: string | undefined;
  s3conf: S3Conf;
  cloudwatch: CloudWatchParams;
  behavior: Behavior;
}

export default class TemplatesController {
  private readonly path = '/templates';

  private rosaeContextsManager: RosaeContextsManager;

  // eslint-disable-next-line new-cap
  public router = express.Router();

  private readonly defaultUser = 'DEFAULT_USER';
  private readonly userIdHeader = 'X-RapidAPI-User';

  initializeRoutes(): void {
    this.router.get(this.path, this.listTemplates);

    this.router.get(`${this.path}/:templateId`, this.getTemplate);

    this.router.get(`/health`, this.getHealth);

    this.router.post(this.path, this.createTemplate).put(this.path, this.createTemplate);
    this.router.post(`${this.path}/render`, this.directRender);
    this.router.post(`${this.path}/:templateId/:templateSha1/render`, this.renderTemplate);

    this.router.delete(`${this.path}/:templateId`, this.deleteTemplate);

    this.router.put(`${this.path}/:templateId/reload`, this.reloadTemplate);
  }

  constructor(serverParams: ServerParams) {
    // cloudwatch logging. done first to get logs asap
    /* istanbul ignore next */
    if (
      serverParams &&
      serverParams.cloudwatch &&
      serverParams.cloudwatch.logGroupName &&
      serverParams.cloudwatch.accessKeyId &&
      serverParams.cloudwatch.secretAccessKey
    ) {
      winston.info({ action: 'startup', message: `starting to configure cloudwatch logging...` });
      const cwt = new CloudWatchTransport({
        logGroupName: serverParams.cloudwatch.logGroupName,
        logStreamName: serverParams.cloudwatch.logStreamName,
        createLogGroup: false,
        createLogStream: false,
        submissionInterval: 2000,
        submissionRetryCount: 1,
        batchSize: 20,
        awsConfig: {
          accessKeyId: serverParams.cloudwatch.accessKeyId,
          secretAccessKey: serverParams.cloudwatch.secretAccessKey,
          region: serverParams.cloudwatch.region,
        },
        //formatLog: item => `${item.level}: ${item.message}`,
      });
      winston.add(cwt);
    }

    // forget templates
    let forgetTemplates = false;
    if (serverParams && serverParams.behavior && serverParams.behavior.forgetTemplates) {
      if (!serverParams.s3conf && !serverParams.templatesPath) {
        winston.error({
          action: 'startup',
          message: 'asked to forget templates, but no backend: parameter is ignored',
        });
      } else {
        forgetTemplates = true;
      }
    }

    // specific ttl and checkPeriod for tests purposes
    let ttl: number = null;
    if (serverParams && serverParams.behavior && serverParams.behavior.cacheTtl) {
      ttl = serverParams.behavior.cacheTtl;
      winston.info({
        action: 'startup',
        message: `using specific ttl: ${ttl}`,
      });
    }
    let checkPeriod: number = null;
    if (serverParams && serverParams.behavior && serverParams.behavior.checkPeriod) {
      checkPeriod = serverParams.behavior.checkPeriod;
      winston.info({
        action: 'startup',
        message: `using specific check period: ${checkPeriod}`,
      });
    }

    const rosaeNlgFeatures: RosaeNlgFeatures = {
      NlgLib: NlgLib,
      getRosaeNlgVersion: getRosaeNlgVersion,
      compileFileClient: compileFileClient,
    };

    const rosaeContextsManagerParams: RosaeContextsManagerParams = {
      forgetTemplates: forgetTemplates,
      specificTtl: ttl,
      specificCheckPeriod: checkPeriod,
      enableCache: true,
    };

    if (serverParams && serverParams.s3conf && serverParams.s3conf.bucket) {
      // if S3
      this.rosaeContextsManager = new S3RosaeContextsManager(
        serverParams.s3conf,
        rosaeNlgFeatures,
        rosaeContextsManagerParams,
      );
      winston.info({
        action: 'startup',
        message: `trying to use s3 ${serverParams.s3conf.bucket}`,
      });
    } else if (serverParams && serverParams.templatesPath) {
      this.rosaeContextsManager = new DiskRosaeContextsManager(
        serverParams.templatesPath,
        rosaeNlgFeatures,
        rosaeContextsManagerParams,
      );
      winston.info({
        action: 'startup',
        message: `trying to use disk ${serverParams.templatesPath}`,
      });
    } else {
      this.rosaeContextsManager = new MemoryRosaeContextsManager(rosaeNlgFeatures, rosaeContextsManagerParams);
      winston.info({
        action: 'startup',
        message: `trying to use only memory`,
      });
    }

    // reload existing templates
    if (this.rosaeContextsManager.hasBackend()) {
      if (serverParams && serverParams.behavior && serverParams.behavior.lazyStartup) {
        winston.info({
          action: 'startup',
          message: `lazy startup: we don't reload`,
        });
      } else {
        winston.info({
          action: 'startup',
          message: `reloading all templates...`,
        });
        this.rosaeContextsManager.reloadAllFiles((err) => {
          winston.warn({
            action: 'startup',
            message: `reloadAllFiles failed: ${err}`,
          });
        });
      }
    }
    this.initializeRoutes();
  }

  reloadTemplate = (request: express.Request, response: express.Response): void => {
    this.getUser(request, response, (user) => {
      const start = performance.now();
      const templateId: string = request.params.templateId;

      if (this.rosaeContextsManager.hasBackend()) {
        winston.info({ user: user, templateId: templateId, action: 'reload', message: `start...` });
        this.rosaeContextsManager.readTemplateOnBackendAndLoad(user, templateId, (err, templateSha1) => {
          if (err) {
            response.status(404).send(`template does not exist, or invalid template`);
            return;
          } else {
            const ms = performance.now() - start;
            response.status(200).send({
              templateId: templateId,
              templateSha1: templateSha1,
              ms: ms,
            });
            return;
          }
        });
      } else {
        winston.info({
          user: user,
          templateId: templateId,
          action: 'reload',
          message: `no storage backend, cannot reload!`,
        });
        response.status(400).send(`no storage backend, cannot reload!`);
        return;
      }
    });
  };

  deleteTemplate = (request: express.Request, response: express.Response): void => {
    this.getUser(request, response, (user) => {
      const templateId: string = request.params.templateId;

      winston.info({ user: user, templateId: templateId, action: 'delete', message: `start delete...` });
      this.rosaeContextsManager.deleteFromCacheAndBackend(user, templateId, (err) => {
        if (err) {
          response.status(204).send(err.message);
          return;
        } else {
          response.status(204).send('ok'); // deleted OK
          return;
        }
      });
    });
  };

  listTemplates = (request: express.Request, response: express.Response): void => {
    this.getUser(request, response, (user) => {
      winston.info({ user: user, action: 'list' });

      if (this.rosaeContextsManager.hasBackend()) {
        this.rosaeContextsManager.getIdsFromBackend(user, (err, templates) => {
          if (err) {
            winston.error({ user: user, action: 'list', message: `error listing templates: ${err}` });
            response.status(500).send(`error listing templates: ${err}`);
          } else {
            winston.info({ user: user, action: 'list', message: `templates: ${templates}` });
            response.status(200).send({
              ids: templates,
            });
          }
        });
      } else {
        // just what we have in cache
        const ids = this.rosaeContextsManager.getIdsInCache(user);
        winston.info({ user: user, action: 'list', message: `templates: ${ids}` });
        response.status(200).send({
          ids: ids,
        });
        return;
      }
    });
  };

  getHealth = (request: express.Request, response: express.Response): void => {
    this.rosaeContextsManager.checkHealth((err) => {
      if (err) {
        winston.error({
          action: 'health',
          message: `health failed: ${err}`,
        });
        response.status(503).send(`health failed`);
      } else {
        response.sendStatus(200);
      }
    });
  };

  getUser = (request: express.Request, response: express.Response, cb: (user: string) => void): void => {
    const user = request.header(this.userIdHeader);
    if (!user) {
      cb(this.defaultUser);
    } else {
      if (user.indexOf('#') > -1) {
        response.status(400).send(`invalid user name: contains #`);
      } else {
        cb(user);
      }
    }
  };

  getTemplate = (request: express.Request, response: express.Response): void => {
    this.getUser(request, response, (user) => {
      const templateId: string = request.params.templateId;
      winston.info({ user: user, templateId: templateId, action: 'get', message: `get original package` });

      this.rosaeContextsManager.getFromCacheOrLoad(user, templateId, null, (err, cacheValue) => {
        if (err) {
          response.status(parseInt(err.name)).send(err.message);
          winston.info({ user: user, templateId: templateId, action: 'get', message: err.message });
          return;
        } else {
          response.status(200).send({
            templateSha1: cacheValue.templateSha1,
            templateContent: cacheValue.rosaeContext.getFullTemplate(),
          });
        }
      });
    });
  };

  createTemplate = (request: express.Request, response: express.Response): void => {
    this.getUser(request, response, (user) => {
      const start = performance.now();
      winston.info({ user: user, action: 'create', message: `creating or updating a template` });
      const templateContent = request.body;

      // we have to save it for persistency and reload
      templateContent.user = user;
      this.rosaeContextsManager.compSaveAndLoad(templateContent, true, (err, templateSha1, rosaeContext) => {
        if (err) {
          response.status(parseInt(err.name)).send(err.message);
        } else {
          const ms = performance.now() - start;
          response.status(201).send({
            templateId: rosaeContext.getTemplateId(),
            templateSha1: templateSha1,
            ms: ms,
          });
          winston.info({
            user: user,
            templateId: rosaeContext.getTemplateId(),
            action: 'create',
            sha1: templateSha1,
            ms: Math.round(ms),
            message: `created`,
          });
        }
      });
    });
  };

  directRender = (request: express.Request, response: express.Response): void => {
    this.getUser(request, response, (user) => {
      const start = performance.now();
      winston.info({ user: user, action: 'directRender', message: `direct rendering of a template...` });

      const templateWithData = request.body;

      // const template = requestContent.template;
      const data = templateWithData.data;

      if (!templateWithData.src) {
        response.status(400).send(`no template src`);
        winston.info({
          user: user,
          action: 'directRender',
          message: `no template src`,
        });
        return;
      }
      if (!data) {
        response.status(400).send(`no data`);
        winston.info({
          user: user,
          action: 'directRender',
          message: `no data`,
        });
        return;
      }

      // key is based solely on the template src part; it does not contain any pre compiled code
      const templateCalculatedId = createHash('sha1').update(JSON.stringify(templateWithData.src)).digest('hex');

      const alreadyHere = this.rosaeContextsManager.isInCache(user, templateCalculatedId);
      if (!alreadyHere) {
        templateWithData.templateId = templateCalculatedId;
        templateWithData.user = user;
        try {
          this.rosaeContextsManager.setInCache(
            user,
            templateCalculatedId,
            {
              templateSha1: templateCalculatedId,
              rosaeContext: new RosaeContext(templateWithData, {
                NlgLib: NlgLib,
                compileFileClient: compileFileClient,
                getRosaeNlgVersion: getRosaeNlgVersion,
              }),
            },
            true,
          );
        } catch (e) {
          response.status(400).send(`error creating template: ${e.message}`);
          winston.info({
            user: user,
            action: 'directRender',
            message: `error creating template: ${e.message}`,
          });
          return;
        }
      }

      const rosaeContext: RosaeContext = this.rosaeContextsManager.getFromCache(user, templateCalculatedId)
        .rosaeContext;
      try {
        const renderedBundle: RenderedBundle = rosaeContext.render(data);
        const status = alreadyHere ? 'EXISTED' : 'CREATED';
        const ms = performance.now() - start;
        response.status(200).send({
          status: status,
          renderedText: renderedBundle.text,
          renderOptions: renderedBundle.renderOptions,
          ms: ms,
        } as DirectRenderResponse);
        winston.info({
          user: user,
          action: 'directRender',
          ms: Math.round(ms),
          message: `rendered ${templateCalculatedId}, ${status}`,
        });
      } catch (e) {
        response.status(400).send(`rendering error: ${e.toString()}`);
        winston.info({
          user: user,
          action: 'directRender',
          message: `rendering error: ${e.toString()}`,
        });
        return;
      }
    });
  };

  renderTemplate = (request: express.Request, response: express.Response): void => {
    this.getUser(request, response, (user) => {
      const start = performance.now();

      const templateId: string = request.params.templateId;
      const templateSha1: string = request.params.templateSha1;

      winston.info({
        user: user,
        templateId: templateId,
        sha1: templateSha1,
        action: 'render',
        message: `start rendering a template...`,
      });

      this.rosaeContextsManager.getFromCacheOrLoad(user, templateId, templateSha1, (err, cacheValue) => {
        if (err) {
          response.status(404).send(`${templateId} does not exist for ${user}`);
          winston.info({
            user: user,
            templateId: templateId,
            action: 'render',
            message: `template does not exist ${err}`,
          });
          return;
        } else {
          try {
            const renderedBundle: RenderedBundle = cacheValue.rosaeContext.render(request.body);
            const ms = performance.now() - start;
            response.status(200).send({
              renderedText: renderedBundle.text,
              renderOptions: renderedBundle.renderOptions,
              ms: ms,
            } as ClassicRenderResponse);
            winston.info({
              user: user,
              templateId: templateId,
              sha1: templateSha1,
              action: 'render',
              ms: Math.round(ms),
              message: `done`,
            });
          } catch (e) {
            response.status(400).send(`rendering error: ${e.toString()}`);
            winston.info({
              user: user,
              templateId: templateId,
              sha1: templateSha1,
              action: 'render',
              message: `rendering error: ${e.toString()}`,
            });
            return;
          }
        }
      });
    });
  };
}
