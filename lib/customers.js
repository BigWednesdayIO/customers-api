'use strict';

const joi = require('joi');
const boom = require('boom');

const customerDb = require('./customer_db');
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
      customerDb.create(request.payload)
        .then(customer => {
          reply(customer).created(`/customers/${customer.id}`);
        })
        .catch(err => {
          if (err.name === 'UserExistsError') {
            return reply(boom.badRequest('Invalid signup.'));
          }
          console.error(err);
          reply(boom.badImplementation());
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
