'use strict';

const Pkg = require('../package.json');

const versionResponse = {
  version: Pkg.version
};

exports.register = function (server, options, next) {
  server.route({
    method: 'GET',
    path: '/version',
    config: {
      description: 'Returns the version of the server',
      handler(request, reply) {
        reply(versionResponse);
      }
    }
  });

  return next();
};

exports.register.attributes = {
  name: 'version'
};
