'use strict';

const boom = require('boom');
const joi = require('joi');
const errorSchemas = require('hapi-error-schemas');

const memberships = require('../membership_repository');
const customers = require('../customer_repository');

const baseMembershipSchema = joi.object({
  supplier_id: joi.string().required().description('Identifier of the supplier the membership is held with'),
  membership_number: joi.string().required().description('Customer\'s supplier membership number')
});

const membershipSchema = baseMembershipSchema.concat(joi.object({
  id: joi.string().required().description('Membership identifier'),
  _metadata: joi.object({
    created: joi.date().required().description('Date the membership was created')
  }).meta({className: 'MembershipMetadata'}).required()
}))
.meta({className: 'Membership'});

const membershipParametersSchema = baseMembershipSchema.meta({className: 'MembershipParameters'});

const verifyCustomer = (req, reply) => {
  customers.get(req.params.customerId)
    .then(reply)
    .catch(err => {
      if (err.name === 'EntityNotFoundError') {
        return reply(boom.notFound(`Customer "${req.params.customerId}" not found.`));
      }
      console.error(err);
      reply(boom.badImplementation(err));
    });
};

exports.register = function (server, options, next) {
  server.route({
    method: 'POST',
    path: '/customers/{customerId}/memberships',
    handler: (req, reply) => {
      memberships.create(req.params.customerId, req.payload)
        .then(membership => {
          reply(membership).created(`/customers/${req.params.customerId}/memberships/${membership.id}`);
        });
    },
    config: {
      tags: ['api'],
      pre: [{method: verifyCustomer}],
      auth: {
        strategy: 'jwt',
        scope: ['customer:{params.customerId}', 'admin']
      },
      validate: {
        params: {
          customerId: joi.string().required().description('Customer id')
        },
        payload: membershipParametersSchema.required().description('Membership to be created')
      },
      response: {
        status: Object.assign({
          201: membershipSchema.description('Created membership resource')
        }, errorSchemas.statuses([401, 403, 404]))
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/customers/{customerId}/memberships',
    handler: (req, reply) => {
      memberships.find(req.params.customerId)
        .then(reply);
    },
    config: {
      tags: ['api'],
      pre: [{method: verifyCustomer}],
      auth: {
        strategy: 'jwt',
        scope: ['customer:{params.customerId}', 'admin']
      },
      validate: {
        params: {
          customerId: joi.string().required().description('Customer id')
        }
      },
      response: {
        status: Object.assign({
          200: joi.array()
                .items(membershipSchema.description('Membership resource'))
                .required()
                .description('Collection of memberships')
        }, errorSchemas.statuses([401, 403, 404]))
      }
    }
  });

  return next();
};

exports.register.attributes = {
  name: 'memberships'
};
