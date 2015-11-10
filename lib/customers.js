'use strict';

const joi = require('joi');
const boom = require('boom');

const auth0Client = require('./auth0_client');
const errorSchema = require('./error_schema');

const createCustomerSchema = joi.object({
  email: joi.string().required().email().description('Customer email address'),
  password: joi.string().required().description('Customer password')
}).meta({
  className: 'CreateCustomerParameters'
});

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
    handler: (request, reply) => {
      auth0Client.createUser({
        connection: process.env.AUTH0_CONNECTION,
        email: request.payload.email,
        password: request.payload.password
      }, (err, customer) => {
        if (err) {
          if (err.code === 'user_exists') {
            return reply(boom.badRequest('Email address already in use or invalid password.'));
          }
          console.error(err);
          return reply(boom.badImplementation());
        }

        reply({id: customer.user_id, email: customer.email}).created(`/customers/${customer.user_id}`);
      });
    },
    config: {
      tags: ['api'],
      validate: {
        payload: createCustomerSchema.description('The customer to be created')
      },
      response: {
        failAction: process.env.RESPONSE_FAIL_ACTION || 'log',
        schema: errorSchema,
        status: {
          201: customerSchema.description('The created customer')
        }
      }
    }
  });

  return next();
};

exports.register.attributes = {
  name: 'customers'
};
