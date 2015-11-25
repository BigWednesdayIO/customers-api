'use strict';

const boom = require('boom');
const joi = require('joi');

const authenticatePassword = require('../password_authenticator');

const errorSchemas = require('hapi-error-schemas');

const sessionSchema = joi.object({
  id: joi.string().required().description('Customer identifier'),
  email: joi.string().required().email().description('Customer email address'),
  token: joi.string().required().description('Authentication token')
}).meta({
  className: 'CustomerSession'
});

const credentialsSchema = joi.object({
  email: joi.string().required().email().description('Customer email address'),
  password: joi.string().required().description('Customer password')
}).meta({
  className: 'CustomerCredentials'
});

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
      auth: false,
      validate: {
        payload: credentialsSchema.required().description('Customer credentials')
      },
      response: {
        status: Object.assign({
          200: sessionSchema.description('Session for customer')
        }, errorSchemas.statuses([401]))
      }
    }
  });

  return next();
};

exports.register.attributes = {
  name: 'authenticate'
};
