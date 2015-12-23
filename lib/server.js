'use strict';

const hapi = require('hapi');
const pkg = require('../package.json');

const errorSchemas = require('hapi-error-schemas');

const basePlugins = [{
  register: require('./jwt_auth_strategy')
}, {
  register: require('hapi-version-route'),
  options: {auth: false}
}, {
  register: require('hapi-boom-decorators')
}, {
  register: require('hapi-swaggered'),
  options: {
    auth: false,
    info: {
      title: 'Customers API',
      version: pkg.version
    }
  }
}];

const applicationPlugins = [
  require('./handlers/customers'),
  require('./handlers/authenticate'),
  require('./handlers/memberships'),
  require('./handlers/product_price_adjustments')
];

module.exports = callback => {
  const server = new hapi.Server({
    connections: {
      routes: {
        response: {
          failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
          status: errorSchemas.statuses()
        }
      }
    }
  });

  server.on('request-internal', (request, event, tags) => {
    // Log response validation failures
    if (tags.error && tags.validation && tags.response) {
      console.error(`Response validation failed for ${request.method} request ${event.request} to ${request.path}: ${event.data}`);
    }
  });

  server.connection({port: 8080});

  server.register(basePlugins, err => {
    if (err) {
      return callback(err);
    }

    server.register(applicationPlugins, err => {
      if (err) {
        return callback(err);
      }

      callback(null, server);
    });
  });
};
