'use strict';

const boom = require('boom');
const joi = require('joi');

const authenticatePassword = require('../password_authenticator');

const errorSchema = require('../error_schema');
const sessionSchema = require('../session_schema');

exports.register = function (server, options, next) {
  server.route({
    method: 'POST',
    path: '/customers/authenticate',
    handler: (req, reply) => {
      authenticatePassword(req.payload.email, req.payload.password)
        .then(authResult => {
          reply(authResult);
        })
        .catch(err => {
          if (err.name === 'AuthenticationFailedError') {
            return reply(boom.badRequest('Invalid email address or password.'));
          }
          console.error(err);
          reply(boom.badImplementation());
        });
    },
    config: {
      tags: ['api'],
      validate: {
        payload: joi.object({
          email: joi.string().required().email().description('Customer email address'),
          password: joi.string().required().description('Customer password')
        }).meta({
          className: 'AuthenticationParameters'
        }).description('Customer authentication parameters')
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
