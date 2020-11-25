/**
 * @license
 * Copyright 2019 Ludan Stoecklé
 * SPDX-License-Identifier: Apache-2.0
 */

import NodeCache = require('node-cache');
import { RosaeContext } from './RosaeContext';
import { PackagedTemplate, RosaeNlgFeatures } from 'rosaenlg-packager';
import * as process from 'process';

interface CacheKey {
  user: string;
  templateId: string;
}

export interface CacheValue {
  templateSha1: string;
  rosaeContext: RosaeContext;
}

export interface RosaeContextsManagerParams {
  // origin: string;
  forgetTemplates?: boolean;
  specificTtl?: number;
  specificCheckPeriod?: number;
  enableCache?: boolean;
  sharedTemplatesUser?: string;
  sharedTemplatesPath?: string;
}

export interface UserAndTemplateId {
  user: string;
  templateId: string;
}

export abstract class RosaeContextsManager {
  private ttl: number;
  private cacheCheckPeriod: number;
  private forgetTemplates: boolean;
  protected enableCache: boolean;
  // protected origin: string;
  protected rosaeNlgFeatures: RosaeNlgFeatures;

  private rosaeContextsCache: NodeCache;
  protected sharedTemplatesUser: string;

  constructor(rosaeContextsManagerParams: RosaeContextsManagerParams) {
    this.ttl = rosaeContextsManagerParams.specificTtl || 600; // 10 minutes
    this.cacheCheckPeriod = rosaeContextsManagerParams.specificCheckPeriod || 60; // 1 minute
    this.forgetTemplates = rosaeContextsManagerParams.forgetTemplates;
    this.enableCache = rosaeContextsManagerParams.enableCache != null ? rosaeContextsManagerParams.enableCache : true; // enabled by default
    // this.origin = rosaeContextsManagerParams.origin;
    this.sharedTemplatesUser = rosaeContextsManagerParams.sharedTemplatesUser;

    this.rosaeContextsCache = new NodeCache({
      checkperiod: this.cacheCheckPeriod,
      useClones: false,
      deleteOnExpire: true,
    });
  }

  protected abstract getAllFiles(cb: (err: Error, files: string[]) => void): void;

  protected abstract getUserAndTemplateId(filename: string): UserAndTemplateId;

  public abstract saveOnBackend(user: string, templateId: string, content: string, cb: (err: Error) => void): void;

  public abstract deleteFromBackend(user: string, templateId: string, cb: (err: Error) => void): void;

  public abstract readTemplateOnBackend(
    user: string,
    templateId: string,
    cb: (err: Error, readContent: any) => void,
  ): void;

  public abstract hasBackend(): boolean;

  public abstract checkHealth(cb: (err: Error) => void): void;

  public getVersion(): string {
    try {
      return this.rosaeNlgFeatures.getRosaeNlgVersion();
    } catch (e) {
      console.log({
        action: 'version',
        message: `cannot get version: ${e.message}`,
      });
      const err = new Error();
      err.name = '500';
      err.message = e.message;
      throw err;
    }
  }

  public readTemplateOnBackendAndLoad(
    user: string,
    templateId: string,
    cb: (err: Error, templateSha1: string, rosaeContext: RosaeContext) => void,
  ): void {
    this.readTemplateOnBackend(user, templateId, (err, templateContent) => {
      if (err) {
        console.warn({
          action: 'load',
          user: user,
          templateId: templateId,
          message: `could not reload: ${err}`,
        });
        cb(err, null, null);
      } else {
        this.compSaveAndLoad(templateContent, false, (loadErr, templateSha1, rosaeContext) => {
          cb(loadErr, templateSha1, rosaeContext);
        });
      }
    });
  }

  public reloadAllFiles(cb: (err: Error) => void): void {
    this.getAllFiles((err, files) => {
      if (err) {
        cb(err);
      } else {
        for (let i = 0; i < files.length; i++) {
          const file: string = files[i];

          const userAndTemplateId = this.getUserAndTemplateId(file);
          if (userAndTemplateId && userAndTemplateId.user && userAndTemplateId.templateId) {
            this.readTemplateOnBackendAndLoad(
              userAndTemplateId.user,
              userAndTemplateId.templateId,
              (_err, _templateSha1) => {
                // do nothing with the error
              },
            );
          } else {
            console.warn({
              action: 'startup',
              message: `invalid file: ${file}`,
            });
          }
        }
        cb(null);
      }
    });
  }

  public getFromCacheOrLoad(
    user: string,
    templateId: string,
    askedSha1: string,
    cb: (err: Error, cacheValue: CacheValue) => void,
  ): void {
    if (
      (askedSha1 && this.enableCache && this.isInCacheWithGoodSha1(user, templateId, askedSha1)) ||
      (!askedSha1 && this.enableCache && this.isInCache(user, templateId))
    ) {
      // already in cache with the proper sha1?
      cb(null, this.getFromCache(user, templateId));
      return;
    } else {
      this.readTemplateOnBackend(user, templateId, (readTemplateErr, templateContent) => {
        if (readTemplateErr) {
          // does not exist: we don't really care
          console.log({
            user: user,
            templateId: templateId,
            action: 'getFromCacheOrLoad',
            message: `error: ${readTemplateErr}`,
          });
          const e = new Error();
          e.name = '404';
          e.message = `${user} ${templateId} not found on backend: ${readTemplateErr.message}`;
          cb(e, null);
          return;
        } else {
          templateContent.user = user;
          this.compSaveAndLoad(templateContent, false, (compErr, loadedSha1, rosaeContext) => {
            if (compErr) {
              const e = new Error();
              e.name = '400';
              e.message = `no existing compiled content for ${templateId}, and could not compile: ${compErr}`;
              cb(e, null);
              return;
            }

            if (askedSha1 && loadedSha1 != askedSha1) {
              const e = new Error();
              e.name = 'WRONG_SHA1'; // don't put directly a 301 here, as it can be a 301 or a 308 when POST
              // leave the <...> as it is parsed for redirection
              e.message = `sha1 do not correspond, read sha1 is <${loadedSha1}> while requested is ${askedSha1}`;
              cb(e, null);
              return;
            }

            // everything is ok
            cb(null, {
              templateSha1: loadedSha1,
              rosaeContext: rosaeContext,
            });
          });
        }
      });
    }
  }

  public deleteFromCacheAndBackend(user: string, templateId: string, cb: (err: Error) => void): void {
    if (this.enableCache) {
      this.deleteFromCache(user, templateId);
    }
    if (this.hasBackend()) {
      this.deleteFromBackend(user, templateId, (err) => {
        if (err) {
          console.log({ user: user, templateId: templateId, action: 'delete', message: `failed: ${err}` });
          const e = new Error();
          //e.name = '500';
          e.message = `delete failed: ${err}`;
          cb(e);
          return;
        } else {
          console.log({ user: user, templateId: templateId, action: 'delete', message: `done.` });
          cb(null);
          return;
        }
      });
    } else {
      cb(null);
    }
  }

  protected getKindOfUuid(): string {
    return `${process.pid}-${Math.floor(Math.random() * 100000)}`; //NOSONAR
  }

  public compSaveAndLoad(
    templateContent: PackagedTemplate,
    alwaysSave: boolean,
    cb: (err: Error, templateSha1: string, rosaeContext: RosaeContext) => void,
  ): void {
    const user = templateContent.user;
    let rosaeContext: RosaeContext;

    // if existing we must enrich first
    if (templateContent.type == 'existing' && !templateContent.src && !templateContent.comp) {
      if (!this.sharedTemplatesUser) {
        cb(new Error('shared templates not activated'), null, null);
        return;
      } else {
        this.getFromCacheOrLoad(this.sharedTemplatesUser, templateContent.which, null, (err, cacheValue) => {
          if (err) {
            cb(new Error(`cannot load shared template: ${templateContent.which}, ${err}`), null, null);
            return;
          } else {
            const sharedRosaeContent = cacheValue.rosaeContext.getFullTemplate();
            templateContent.src = sharedRosaeContent.src;
            templateContent.comp = sharedRosaeContent.comp;
            this.compSaveAndLoad(templateContent, alwaysSave, cb);
            // cacheValue.templateSha1
            // what could we do with it?
          }
        });
      }
    } else {
      try {
        rosaeContext = new RosaeContext(templateContent, this.rosaeNlgFeatures);
      } catch (e) {
        console.log({
          user: user,
          action: 'create',
          message: `error creating template: ${e.message}`,
        });
        const err = new Error();
        err.name = '400';
        err.message = e.message;
        cb(err, null, null);
        return;
      }

      const templateId = rosaeContext.getTemplateId();
      if (!templateId) {
        const err = new Error();
        err.name = '400';
        err.message = 'no templateId!';
        cb(err, null, null);
        console.log({ user: user, action: 'create', message: `no templateId` });
        return;
      } else {
        const templateSha1 = rosaeContext.getSha1();
        const cacheValue: CacheValue = {
          templateSha1: templateSha1,
          rosaeContext: rosaeContext,
        };
        if (this.enableCache) {
          this.setInCache(user, templateId, cacheValue, false);
        }
        if (this.hasBackend() && (alwaysSave || rosaeContext.hadToCompile)) {
          this.saveOnBackend(user, templateId, JSON.stringify(rosaeContext.getFullTemplate()), (err) => {
            if (err) {
              console.error({
                user: user,
                action: 'create',
                sha1: templateSha1,
                message: `could not save to backend: ${err}`,
              });
              const e = new Error();
              e.name = '500';
              e.message = 'could not save to backend';
              cb(e, null, null);
              return;
            } else {
              console.log({
                user: user,
                action: 'create',
                sha1: templateSha1,
                message: `saved to backend`,
              });
              cb(null, templateSha1, rosaeContext);
              return;
            }
          });
        } else {
          cb(null, templateSha1, rosaeContext);
          return;
        }
      }
    }
  }

  public getIdsFromBackend(user: string, cb: (err: Error, templates: string[]) => void): void {
    this.getAllFiles((err, files) => {
      if (err) {
        cb(err, null);
      } else {
        const ids: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const file: string = files[i];
          const userAndTemplateId = this.getUserAndTemplateId(file);
          if (userAndTemplateId && userAndTemplateId.user == user && userAndTemplateId.templateId) {
            ids.push(userAndTemplateId.templateId);
          }
        }
        cb(null, ids);
      }
    });
  }

  protected getUserAndTemplateIdHelper(filename: string, sep: string): UserAndTemplateId {
    const splited = filename.split(sep);
    if (splited.length != 2) {
      console.error({
        message: `invalid file: ${splited}`,
      });
      return null;
    }
    return { user: splited[0], templateId: splited[1].replace(/\.json$/, '') };
  }

  private checkCacheEnable(): void {
    if (!this.enableCache) {
      const err = new Error();
      err.name = 'InvalidArgumentError';
      err.message = `trying to use cache but enableCache is false`;
      throw err;
    }
  }

  private getCacheKey(user: string, templateId: string): string {
    this.checkCacheEnable();
    const key = JSON.stringify({
      user: user,
      templateId: templateId,
    });

    const currTtl = this.rosaeContextsCache.getTtl(key);
    if (currTtl == undefined) {
      // not in cache yet, don't do anything
    } else if (currTtl == 0) {
      // no TTl, we don't change it
    } else {
      // reset ttl
      this.rosaeContextsCache.ttl(key, this.ttl);
    }

    return key;
  }

  public getFromCache(user: string, templateId: string): CacheValue {
    this.checkCacheEnable();
    return this.rosaeContextsCache.get(this.getCacheKey(user, templateId));
  }
  public isInCache(user: string, templateId: string): boolean {
    this.checkCacheEnable();
    return this.rosaeContextsCache.has(this.getCacheKey(user, templateId));
  }
  public isInCacheWithGoodSha1(user: string, templateId: string, templateSha1: string): boolean {
    this.checkCacheEnable();
    const cacheValue = this.getFromCache(user, templateId);
    if (!cacheValue) {
      return false;
    } else {
      if (cacheValue.templateSha1 === templateSha1) {
        return true;
      } else {
        return false;
      }
    }
  }

  public setInCache(user: string, templateId: string, cacheValue: CacheValue, isTemp: boolean): void {
    this.checkCacheEnable();
    let ttl: number;
    if (isTemp || this.forgetTemplates) {
      ttl = this.ttl;
    } else {
      ttl = 0;
    }
    this.rosaeContextsCache.set(this.getCacheKey(user, templateId), cacheValue, ttl);
  }
  public deleteFromCache(user: string, templateId: string): void {
    this.checkCacheEnable();
    this.rosaeContextsCache.del(this.getCacheKey(user, templateId));
  }
  public getIdsInCache(user: string): string[] {
    this.checkCacheEnable();
    const cacheKeys = Array.from(this.rosaeContextsCache.keys());
    const ids: string[] = [];
    for (let i = 0; i < cacheKeys.length; i++) {
      const rawCacheKey = cacheKeys[i];
      const cacheKey: CacheKey = JSON.parse(rawCacheKey);
      // we don't keep temp ones
      if (cacheKey.user == user && this.rosaeContextsCache.getTtl(rawCacheKey) == 0) {
        ids.push(cacheKey.templateId);
      }
    }
    return ids;
  }

  // for debug only
  /*
  public getAllKeys(): string[] {
    return Array.from(this.rosaeContextsCache.keys());
  }
  */
}
