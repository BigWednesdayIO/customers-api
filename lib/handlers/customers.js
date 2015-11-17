'use strict';

const boom = require('boom');
const joi = require('joi');

const authenticatePassword = require('../password_authenticator');
const customerRepository = require('../customer_repository');

const errorSchema = require('../schemas/error_schema');
const sessionSchema = require('../schemas/session_schema');
const credentialsSchema = require('../schemas/credentials_schema');

const customerSchema = joi.object({
  id: joi.string().required().description('Customer identifier'),
  email: joi.string().required().email().description('Customer email address')
}).meta({
  className: 'Customer'
});

exports.register = function (server, options, next) {
  server.route({
    method: 'POST',
    path: '/customers',
    handler: (req, reply) => {
      customerRepository.create(req.payload)
        .then(() => {
          return authenticatePassword(req.payload.email, req.payload.password);
        })
        .then(authResult => {
          reply(authResult).created(`/customers/${authResult.id}`);
        })
        .catch(err => {
          if (err.name === 'UserExistsError' || err.name === 'InvalidPasswordError') {
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

  server.route({
    method: 'GET',
    path: '/customers/{id}',
    handler: (req, reply) => {
      customerRepository.get(req.params.id)
        .then(customer => {
          reply(customer ? customer : boom.notFound());
        })
        .catch(err => {
          console.error(err);
          reply(boom.badImplementation(err));
        });
    },
    config: {
      tags: ['api'],
      validate: {
        params: {
          id: joi.string().required().description('Customer identifier')
        }
      },
      response: {
        failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
        schema: errorSchema,
        status: {
          200: customerSchema.description('The requested customer resource')
        }
      }
    }
  });

  return next();
};

exports.register.attributes = {
  name: 'customers'
};
