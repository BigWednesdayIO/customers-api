'use strict';

const jwtScheme = require('hapi-auth-jwt2');

exports.register = function (server, options, next) {
  server.register(jwtScheme, err => {
    if (err) {
      return next(err);
    }

    server.auth.strategy('jwt', 'jwt', {
      key: new Buffer(process.env.AUTH0_CLIENT_SECRET, 'base64'),
      validateFunc: (decoded, request, callback) => {
        callback(null, true);
      },
      verifyOptions: {
        algorithms: ['HS256'],
        audience: process.env.AUTHO_CLIENT_ID,
        issuer: `https://${process.env.AUTH0_DOMAIN}/`
      },
      urlKey: 'token'
    });

    server.auth.default('jwt');

    return next();
  });
};

exports.register.attributes = {
  name: 'jwtAuthStrategy'
};

