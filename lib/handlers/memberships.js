'use strict';

const joi = require('joi');
const cuid = require('cuid');

const errorSchemas = require('hapi-error-schemas');

const baseMembershipSchema = joi.object({
  supplier_id: joi.string().required().description('Identifier of the supplier the membership is held with'),
  membership_number: joi.string().required().description('Customer\'s supplier membership number')
});

const membershipSchema = baseMembershipSchema.concat(joi.object({
  id: joi.string().required().description('Membership identifier')
}))
.meta({className: 'Membership'});

const membershipParametersSchema = baseMembershipSchema.meta({className: 'MembershipParameters'});

exports.register = function (server, options, next) {
  server.route({
    method: 'POST',
    path: '/customers/{customerId}/memberships',
    handler: (req, reply) => {
      const id = cuid();
      reply(Object.assign({id}, req.payload))
        .created(`/customers/${req.params.customerId}/memberships/${id}`);
    },
    config: {
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['customer:{params.customerId}']
      },
      validate: {
        params: {
          customerId: joi.string().required().description('Customer id')
        },
        payload: membershipParametersSchema.description('Membership to be created')
      },
      response: {
        status: Object.assign({
          201: membershipSchema.description('Created membership resource')
        }, errorSchemas.statuses([401]))
      }
    }
  });

  return next();
};

exports.register.attributes = {
  name: 'memberships'
};
