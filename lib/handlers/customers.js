'use strict';

const boom = require('boom');
const joi = require('joi');

const authenticatePassword = require('../password_authenticator');
const customerDb = require('../customer_db');
const errorSchema = require('../error_schema');

const createCustomerSchema = joi.object({
  email: joi.string().required().email().description('Customer email address'),
  password: joi.string().required().description('Customer password')
}).meta({
  className: 'CreateCustomerParameters'
});

const sessionSchema = joi.object({
  id: joi.string().required().description('Customer identifier'),
  email: joi.string().required().email().description('Customer email address'),
  token: joi.string().required().description('Authentication token')
}).meta({
  className: 'CustomerSession'
});

exports.register = function (server, options, next) {
  server.route({
    method: 'POST',
    path: '/customers',
    handler: (req, reply) => {
      customerDb.create(req.payload)
        .then(customer => {
          authenticatePassword(req.payload.email, req.payload.password)
            .then(token => {
              reply(Object.assign({token}, customer)).created(`/customers/${customer.id}`);
            });
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
        payload: createCustomerSchema.description('The customer to be created')
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
