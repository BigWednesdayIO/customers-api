'use strict';

const boom = require('boom');
const joi = require('joi');

const customerRepository = require('../customer_repository');

const errorSchema = require('../error_schema');

const baseCustomerSchema = joi.object({
  email: joi.string().required().email().description('Customer email address'),
  vat_number: joi.string().description('VAT number'),
  line_of_business: joi.string().description('Line of business')
});

const createCustomerSchema = baseCustomerSchema.concat(joi.object({
  password: joi.string().required().description('Customer password')
})).meta({
  className: 'CustomerCreateParameters'
});

const customerSchema = baseCustomerSchema.concat(joi.object({
  id: joi.string().required().description('Customer identifier'),
  _metadata: joi.object({
    created: joi.date().required().description('Date the customer is was created')
  }).required()
})).meta({
  className: 'Customer'
});

const customerUpdateSchema = baseCustomerSchema.meta({
  className: 'CustomerUpdateParameters'
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
          if (err.name === 'CustomerExistsError' || err.name === 'InvalidPasswordError') {
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
          reply(customer);
        })
        .catch(err => {
          if (err.name === 'CustomerNotFoundError') {
            return reply(boom.notFound());
          }
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

  server.route({
    method: 'PUT',
    path: '/customers/{id}',
    handler: (req, reply) => {
      customerRepository.update(req.params.id, req.payload)
        .then(customer => {
          reply(customer);
        })
        .catch(err => {
          if (err.name === 'CustomerNotFoundError') {
            return reply(boom.notFound());
          }
          console.error(err);
          reply(boom.badImplementation(err));
        });
    },
    config: {
      tags: ['api'],
      validate: {
        params: {
          id: joi.string().required().description('Customer identifier')
        },
        payload: customerUpdateSchema.description('Customer details to be updated')
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
