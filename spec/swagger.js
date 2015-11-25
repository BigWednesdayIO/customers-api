'use strict';

const swaggerSpec = require('swagger-tools').specs.v2;
const expect = require('chai').expect;

describe('/swagger', () => {
  let swagger;

  before(done => {
    require('../lib/server')((err, server) => {
      if (err) {
        return console.error(err);
      }

      server.inject({url: '/swagger', method: 'GET'}, response => {
        swagger = JSON.parse(response.payload);
        done();
      });
    });
  });

  it('generates a valid swagger schema', () => {
    swaggerSpec.validate(swagger, (err, result) => {
      if (result && result.errors) {
        console.error(result.errors);
      }
      if (result && result.warnings) {
        console.error(result.warnings);
      }

      expect(err).to.not.be.ok;
      expect(result).to.equal(undefined);
    });
  });

  it('does not contain generic definitions', () => {
    const names = Object.keys(swagger.definitions);

    names.forEach(name => {
      expect(name.endsWith('Model')).to.equal(false, `Found generic model "${name}" in swagger schema. Set meta className attribute.`);
    });
  });
});
