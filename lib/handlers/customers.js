'use strict';

const boom = require('boom');
const joi = require('joi');

const customers = require('../stores/customer_store');

const errorSchemas = require('hapi-error-schemas');

const baseCustomerSchema = joi.object({
  email: joi.string().required().email().description('Customer email address'),
  vat_number: joi.string().description('VAT number'),
  line_of_business: joi.string().description('Line of business'),
  addresses: joi.array().items(
    joi.object({
      name: joi.string().required().description('Contact name for the customer address'),
      company: joi.string().required().description('Company name for the customer address'),
      line_1: joi.string().required().description('Line one of the customer address'),
      line_2: joi.string().description('Line two of the customer address'),
      line_3: joi.string().description('Line three of the customer address'),
      city: joi.string().description('City of the customer address'),
      region: joi.string().description('Region of the customer address'),
      postcode: joi.string().required().description('Postcode of the customer address')
    }).meta({className: 'AddressObject'})
  ).meta({className: 'CustomerAddresses'})
});

const customerSchema = baseCustomerSchema.concat(joi.object({
  id: joi.string().required().description('Customer identifier'),
  _metadata: joi.object({
    created: joi.date().required().description('Date the customer was created')
  }).meta({className: 'CustomerMetadata'}).required()
}))
.meta({className: 'Customer'});

exports.register = function (server, options, next) {
  server.route({
    method: 'POST',
    path: '/customers',
    handler: (req, reply) => {
      customers.create(req.payload)
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
        .required()
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
      customers.get(req.params.id)
        .then(reply)
        .catch(err => {
          if (err.name === 'EntityNotFoundError') {
            return reply(boom.notFound(`Customer "${req.params.id}" not found.`));
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
        }, errorSchemas.statuses([401, 403, 404]))
      }
    }
  });

  server.route({
    method: 'PUT',
    path: '/customers/{id}',
    handler: (req, reply) => {
      customers.update(req.params.id, req.payload)
        .then(customer => {
          reply(customer);
        })
        .catch(err => {
          if (err.name === 'EntityNotFoundError') {
            return reply(boom.notFound(`Customer "${req.params.id}" not found.`));
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
        payload: baseCustomerSchema
          .required()
          .meta({className: 'CustomerUpdateParameters'})
          .description('Customer details to be updated')
      },
      response: {
        status: Object.assign({
          200: customerSchema.description('The updated customer resource')
        }, errorSchemas.statuses([401, 403, 404]))
      }
    }
  });

  return next();
};

exports.register.attributes = {
  name: 'customers'
};
