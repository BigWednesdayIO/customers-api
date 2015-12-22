'use strict';

const boom = require('boom');
const joi = require('joi');
const errorSchemas = require('hapi-error-schemas');

const memberships = require('../stores/membership_store');
const customers = require('../stores/customer_store');

const baseMembershipSchema = joi.object({
  supplier_id: joi.string().required().description('Identifier of the supplier the membership is held with'),
  membership_number: joi.string().required().description('Customer\'s supplier membership number'),
  price_adjustment_group_id: joi.string().description('Identifier of the price adjustment group to use for price calculations')
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
                .description('Memberships collection')
        }, errorSchemas.statuses([401, 403, 404]))
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/customers/{customerId}/memberships/{membershipId}',
    handler: (req, reply) => {
      memberships.get(req.params.customerId, req.params.membershipId)
        .then(reply)
        .catch(err => {
          if (err.name === 'EntityNotFoundError') {
            return reply(boom.notFound(`Membership "${req.params.membershipId}" not found.`));
          }
          console.error(err);
          reply(boom.badImplementation(err));
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
          customerId: joi.string().required().description('Customer id'),
          membershipId: joi.string().required().description('Membership id')
        }
      },
      response: {
        status: Object.assign({
          200: membershipSchema.description('Membership resource')
        }, errorSchemas.statuses([401, 403, 404]))
      }
    }
  });

  server.route({
    method: 'PUT',
    path: '/customers/{customerId}/memberships/{membershipId}',
    handler: (req, reply) => {
      memberships.update(req.params.customerId, req.params.membershipId, req.payload)
        .then(reply)
        .catch(err => {
          if (err.name === 'EntityNotFoundError') {
            return reply(boom.notFound(`Membership "${req.params.membershipId}" not found.`));
          }
          console.error(err);
          reply(boom.badImplementation(err));
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
          customerId: joi.string().required().description('Customer id'),
          membershipId: joi.string().required().description('Membership id')
        },
        payload: membershipParametersSchema.required().description('Membership to be updated')
      },
      response: {
        status: Object.assign({
          200: membershipSchema.description('Membership resource')
        }, errorSchemas.statuses([401, 403, 404]))
      }
    }
  });

  server.route({
    method: 'DELETE',
    path: '/customers/{customerId}/memberships/{membershipId}',
    handler: (req, reply) => {
      memberships.delete(req.params.customerId, req.params.membershipId)
        .then(() => reply().code(204))
        .catch(err => {
          if (err.name === 'EntityNotFoundError') {
            return reply(boom.notFound(`Membership "${req.params.membershipId}" not found.`));
          }
          console.error(err);
          reply(boom.badImplementation(err));
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
          customerId: joi.string().required().description('Customer id'),
          membershipId: joi.string().required().description('Membership id')
        }
      },
      response: {
        status: errorSchemas.statuses([401, 403, 404])
      }
    }
  });

  return next();
};

exports.register.attributes = {
  name: 'memberships'
};
