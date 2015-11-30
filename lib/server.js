'use strict';

const hapi = require('hapi');
const swaggered = require('hapi-swaggered');
const pkg = require('../package.json');
const version = require('hapi-version-route');

const jwtAuthStrategy = require('./jwt_auth_strategy');
const customers = require('./handlers/customers');
const authenticate = require('./handlers/authenticate');
const memberships = require('./handlers/memberships');
const errorSchemas = require('hapi-error-schemas');

const basePlugins = [{
  register: jwtAuthStrategy
}, {
  register: version,
  options: {auth: false}
}, {
  register: swaggered,
  options: {
    auth: false,
    info: {
      title: 'Customers API',
      version: pkg.version
    }
  }
}];

const applicationPlugins = [customers, authenticate, memberships];

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
