'use strict';

const boom = require('boom');

const authenticatePassword = require('../password_authenticator');

const errorSchema = require('../schemas/error_schema');
const sessionSchema = require('../schemas/session_schema');
const credentialsSchema = require('../schemas/credentials_schema');

exports.register = function (server, options, next) {
  server.route({
    method: 'POST',
    path: '/customers/authenticate',
    handler: (req, reply) => {
      authenticatePassword(req.payload.email, req.payload.password)
        .then(reply)
        .catch(err => {
          if (err.name === 'AuthenticationFailedError') {
            return reply(boom.unauthorized('Invalid email address or password.'));
          }
          console.error(err);
          reply(boom.badImplementation());
        });
    },
    config: {
      tags: ['api'],
      validate: {
        payload: credentialsSchema.description('Customer credentials')
      },
      response: {
        failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
        schema: errorSchema,
        status: {
          200: sessionSchema.description('Session for customer')
        }
      }
    }
  });

  return next();
};

exports.register.attributes = {
  name: 'authenticate'
};
