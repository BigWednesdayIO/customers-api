'use strict';

const Joi = require('joi');
const errorSchema = require('./error_schema');

const createCustomerSchema = Joi.object({
  email: Joi.string().required().email().description('Customer email address'),
  password: Joi.string().required().description('Customer password')
}).meta({
  className: 'CreateCustomerParameters'
});

const customerSchema = Joi.object({
  id: Joi.string().required().description('Customer identifier'),
  email: Joi.string().required().email().description('Customer email address')
}).meta({
  className: 'Customer'
});

let customerId = 1;

const customerDb = {};

exports.register = function (server, options, next) {
  server.route({
    method: 'POST',
    path: '/customers',
    handler: (request, reply) => {
      const id = (customerId++).toString();
      customerDb[id] = {id, email: request.payload.email};
      reply(customerDb[id]).created(`/customers/${id}`);
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
