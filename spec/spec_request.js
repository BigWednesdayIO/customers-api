'use strict';

module.exports = function (options) {
  return new Promise((resolve, reject) => {
    require('../lib/server')((err, server) => {
      if (err) {
        return reject(err);
      }

      server.initialize(err => {
        if (err) {
          return reject(err);
        }

        server.inject({url: '/swagger', method: 'GET'}, swaggerResponse => {
          const swagger = swaggerResponse.result;

          server.inject(options, response => {
            if (!response.request.route || response.request.route.path === '/{p*}') {
              return reject(new Error(`Undefined route ${options.url}`));
            }

            const route = response.request.route.path;
            const method = response.request.method;

            const swaggerPath = swagger.paths[route];

            if (!swaggerPath) {
              return reject(new Error(`Route ${route} is undocumented.`));
            }

            const swaggerMethod = swaggerPath[method];

            if (!swaggerMethod) {
              return reject(new Error(`${method} for route ${route} is undocumented.`));
            }

            const statusResponse = swaggerMethod.responses[response.statusCode];

            if (response.statusCode !== 204 && !statusResponse) {
              return reject(new Error(`${response.statusCode} response for route ${route} is undocumented.`));
            }

            if (statusResponse && statusResponse.description.length === 0) {
              return reject(new Error(`${response.statusCode} response for route ${route} is missing description.`));
            }

            resolve(response);
          });
        });
      });
    });
  });
};
