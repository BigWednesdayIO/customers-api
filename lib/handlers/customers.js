'use strict';

const boom = require('boom');

const authenticatePassword = require('../password_authenticator');
const customerDb = require('../customer_db');

const errorSchema = require('../error_schema');
const sessionSchema = require('../session_schema');
const credentialsSchema = require('../credentials_schema');

exports.register = function (server, options, next) {
  server.route({
    method: 'POST',
    path: '/customers',
    handler: (req, reply) => {
      customerDb.create(req.payload)
        .then(() => {
          return authenticatePassword(req.payload.email, req.payload.password);
        })
        .then(authResult => {
          reply(authResult).created(`/customers/${authResult.id}`);
        })
        .catch(err => {
          if (err.name === 'UserExistsError') {
            return reply(boom.badRequest('Email address already in use or invalid password.'));
          }
          console.error(err);
          reply(boom.badImplementation());
        });
    },
    config: {
      tags: ['api'],
      validate: {
        payload: credentialsSchema.description('Credentials of customer to be created')
      },
      response: {
        failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
        schema: errorSchema,
        status: {
          201: sessionSchema.description('Session for created customer')
        }
      }
    }
  });

  return next();
};

exports.register.attributes = {
  name: 'customers'
};
