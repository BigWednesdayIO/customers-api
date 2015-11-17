'use strict';

const boom = require('boom');
const joi = require('joi');

const customerRepository = require('../customer_repository');

const errorSchema = require('../error_schema');

const baseCustomerSchema = joi.object({
  email: joi.string().required().email().description('Customer email address'),
  vatNumber: joi.string().description('VAT number')
});

const createCustomerSchema = baseCustomerSchema.concat(joi.object({
  password: joi.string().required().description('Customer password')
})).meta({
  className: 'CustomerCreateParameters'
});

const customerSchema = baseCustomerSchema.concat(joi.object({
  id: joi.string().required().description('Customer identifier')
})).meta({
  className: 'Customer'
});

exports.register = function (server, options, next) {
  server.route({
    method: 'POST',
    path: '/customers',
    handler: (req, reply) => {
      customerRepository.create(req.payload)
        .then(customer => {
          reply(customer).created(`/customers/${customer.id}`);
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
        payload: createCustomerSchema.description('Customer to be created')
      },
      response: {
        status: {
          201: customerSchema.description('Created customer resource')
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
        status: {
          200: customerSchema.description('The requested customer resource'),
          404: errorSchema.description('Not found')
        }
      }
    }
  });

  return next();
};

exports.register.attributes = {
  name: 'customers'
};
