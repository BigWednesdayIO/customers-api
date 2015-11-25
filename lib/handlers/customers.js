'use strict';

const boom = require('boom');
const joi = require('joi');

const customerRepository = require('../customer_repository');

const errorSchemas = require('hapi-error-schemas');

const baseCustomerSchema = joi.object({
  email: joi.string().required().email().description('Customer email address'),
  vat_number: joi.string().description('VAT number'),
  line_of_business: joi.string().description('Line of business'),
  supplier_relationships: joi.array().items(joi.object({
    supplier_id: joi.string().required().description('Supplier identifier'),
    relationship_number: joi.string().description('Supplier\'s customer identifier')
  }).meta({className: 'CustomerRelationship'})).description('Customer relationships')
});

const customerSchema = baseCustomerSchema.concat(joi.object({
  id: joi.string().required().description('Customer identifier'),
  _metadata: joi.object({
    created: joi.date().required().description('Date the customer is was created')
  }).meta({className: 'CustomerMetadata'}).required()
}))
.meta({className: 'Customer'});

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
      auth: false,
      validate: {
        payload: baseCustomerSchema.concat(joi.object({
          password: joi.string().required().description('Customer password')
        }))
        .meta({className: 'CustomerCreateParameters'})
        .description('Customer to be created')
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
      auth: {
        strategy: 'jwt',
        scope: ['customer:{params.id}', 'admin']
      },
      validate: {
        params: {
          id: joi.string().required().description('Customer identifier')
        }
      },
      response: {
        status: Object.assign({
          200: customerSchema.description('The requested customer resource')
        }, errorSchemas.statuses([403, 404]))
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
      auth: {
        strategy: 'jwt',
        scope: ['customer:{params.id}', 'admin']
      },
      validate: {
        params: {
          id: joi.string().required().description('Customer identifier')
        },
        payload: baseCustomerSchema.meta({className: 'CustomerUpdateParameters'}).description('Customer details to be updated')
      },
      response: {
        status: Object.assign({
          200: customerSchema.description('The updated customer resource')
        }, errorSchemas.statuses([403, 404]))
      }
    }
  });

  return next();
};

exports.register.attributes = {
  name: 'customers'
};
