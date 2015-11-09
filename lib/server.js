'use strict';

const hapi = require('hapi');
const swaggered = require('hapi-swaggered');
const pkg = require('../package.json');

const version = require('./version');

const plugins = [{
  register: version
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

module.exports = callback => {
  const server = new hapi.Server();

  server.on('request-internal', (request, event, tags) => {
    // Log response validation failures
    if (tags.error && tags.validation && tags.response) {
      console.error(`Response validation failed for ${request.method} request ${event.request} to ${request.path}: ${event.data}`);
    }
  });

  server.connection({port: 8080});

  server.register(plugins, {routes: {prefix: '/customers'}}, err => {
    if (err) {
      return callback(err);
    }

    callback(null, server);
  });
};
