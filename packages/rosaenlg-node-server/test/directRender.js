/**
 * @license
 * Copyright 2019 Ludan Stoecklé
 * SPDX-License-Identifier: Apache-2.0
 */

const assert = require('assert');
const chai = require('chai');
const chaiHttp = require('chai-http');
const App = require('../dist/app').App;
const TemplatesController = require('../dist/templates.controller').default;
const helper = require('./helper');

chai.use(chaiHttp);
chai.should();

function createAndRender(app, name, done) {
  chai
    .request(app)
    .post(`/templates/render`)
    .set('content-type', 'application/json')
    .send(helper.getTestTemplate('chanson_with_data'))
    .end((_err, _res) => {
      done();
    });
}

describe('direct render', function () {
  before(function () {
    process.env.JWT_USE = false;
  });
  after(function () {
    helper.resetEnv();
  });

  describe('nominal test', function () {
    let app;
    before(function () {
      app = new App([new TemplatesController({ userIdHeader: 'MyAuthHeader' })], 5001).server;
    });
    after(function (done) {
      app.close();
      done();
    });
    it(`should render`, function (done) {
      chai
        .request(app)
        .post(`/templates/render`)
        .set('content-type', 'application/json')
        .send(helper.getTestTemplate('chanson_with_data'))
        .end((_err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          const content = res.body;
          assert.strictEqual(content.renderOptions.language, 'fr_FR');
          assert.strictEqual(content.status, 'CREATED');
          assert(
            content.renderedText.indexOf(`Il chantera "Non, je ne regrette rien" d'Édith Piaf`) > -1,
            content.renderedText,
          );
          done();
        });
    });
  });

  describe('updated on second call', function () {
    let app;
    before(function (done) {
      app = new App([new TemplatesController({ userIdHeader: 'MyAuthHeader' })], 5002).server;
      createAndRender(app, 'chanson_with_data', done);
    });
    after(function (done) {
      app.close();
      done();
    });
    it(`should just be updated`, function (done) {
      chai
        .request(app)
        .post(`/templates/render`)
        .set('content-type', 'application/json')
        .send(helper.getTestTemplate('chanson_with_data'))
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          const content = res.body;
          assert.strictEqual(content.status, 'EXISTED');
          assert(
            content.renderedText.indexOf(`Il chantera "Non, je ne regrette rien" d'Édith Piaf`) > -1,
            content.renderedText,
          );
          done();
        });
    });
  });

  describe('just change the data', function () {
    let app;
    before(function (done) {
      app = new App([new TemplatesController({ userIdHeader: 'MyAuthHeader' })], 5002).server;
      createAndRender(app, 'chanson_with_data', done);
    });
    after(function (done) {
      app.close();
      done();
    });
    it(`should just be updated, and new result`, function (done) {
      const parachutiste = JSON.parse(helper.getTestTemplate('chanson_with_data'));
      parachutiste.data.chanson.auteur = 'Maxime Le Forestier';
      parachutiste.data.chanson.nom = 'Parachutiste';

      chai
        .request(app)
        .post(`/templates/render`)
        .set('content-type', 'application/json')
        .send(parachutiste)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          const content = res.body;
          assert.strictEqual(content.status, 'EXISTED');
          assert(
            content.renderedText.indexOf(`Il chantera "Parachutiste" de Maxime Le Forestier`) > -1,
            content.renderedText,
          );
          done();
        });
    });
  });

  describe('template list', function () {
    let app;
    before(function (done) {
      app = new App([new TemplatesController({ userIdHeader: 'MyAuthHeader' })], 5002).server;
      createAndRender(app, 'chanson_with_data', done);
    });
    after(function (done) {
      app.close();
      done();
    });
    it('template list must remain empty', function (done) {
      chai
        .request(app)
        .get('/templates')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          const content = res.body;
          assert(content.ids);
          assert.strictEqual(content.ids.length, 0);
          done();
        });
    });
  });

  describe('change the template', function () {
    let app;
    before(function (done) {
      app = new App([new TemplatesController({ userIdHeader: 'MyAuthHeader' })], 5002).server;
      createAndRender(app, 'chanson_with_data', done);
    });
    after(function (done) {
      app.close();
      done();
    });
    it(`new template, new result`, function (done) {
      const withElle = JSON.parse(helper.getTestTemplate('chanson_with_data').replace('il ', ' elle '));

      chai
        .request(app)
        .post(`/templates/render`)
        .set('content-type', 'application/json')
        .send(withElle)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          const content = res.body;
          assert.strictEqual(content.status, 'CREATED');
          assert(
            content.renderedText.indexOf(`Elle chantera "Non, je ne regrette rien" d'Édith Piaf`) > -1,
            content.renderedText,
          );
          done();
        });
    });
  });

  describe('edge cases', function () {
    let app;
    before(function (done) {
      app = new App([new TemplatesController({ userIdHeader: 'MyAuthHeader' })], 5002).server;
      createAndRender(app, 'chanson_with_data', done);
    });
    after(function (done) {
      app.close();
      done();
    });

    it(`should fail as there is no template`, function (done) {
      const parsedTemplate = JSON.parse(helper.getTestTemplate('chanson_with_data'));
      delete parsedTemplate['src'];

      chai
        .request(app)
        .post(`/templates/render`)
        .set('content-type', 'application/json')
        .send(parsedTemplate)
        .end((err, res) => {
          res.should.have.status(400);
          assert(res.text.indexOf('no template') > -1, res.text);
          done();
        });
    });

    it(`should fail as there is no data`, function (done) {
      const parsedTemplate = JSON.parse(helper.getTestTemplate('chanson_with_data'));
      delete parsedTemplate['data'];
      chai
        .request(app)
        .post(`/templates/render`)
        .set('content-type', 'application/json')
        .send(parsedTemplate)
        .end((err, res) => {
          res.should.have.status(400);
          assert(res.text.indexOf('no data') > -1, res.text);
          done();
        });
    });

    it(`should not compile`, function (done) {
      const parsedTemplate = JSON.parse(helper.getTestTemplate('chanson_with_data').replace(')]', ''));
      chai
        .request(app)
        .post(`/templates/render`)
        .set('content-type', 'application/json')
        .send(parsedTemplate)
        .end((err, res) => {
          res.should.have.status(400);
          assert(res.text.indexOf('error creating template') > -1, res.text);
          done();
        });
    });
    it(`should not render`, function (done) {
      const parsedTemplate = JSON.parse(helper.getTestTemplate('chanson_with_data'));
      delete parsedTemplate.data['chanson'];
      chai
        .request(app)
        .post(`/templates/render`)
        .set('content-type', 'application/json')
        .send(parsedTemplate)
        .end((err, res) => {
          res.should.have.status(400);
          assert(res.text.indexOf('rendering error') > -1, res.text);
          done();
        });
    });
  });
});
