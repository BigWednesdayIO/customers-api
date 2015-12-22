'use strict';

const cuid = require('cuid');
const errorSchemas = require('hapi-error-schemas');
const Joi = require('joi');

const dataset = require('../dataset');
const adjustmentsModel = require('gcloud-datastore-model')(dataset);

module.exports.register = (server, options, next) => {
  server.route({
    path: '/customers/{customerId}/memberships/{membershipId}/product_price_adjustments',
    method: 'POST',
    handler(req, reply) {
      const key = dataset.key(['Customer', req.params.customerId, 'Membership', req.params.membershipId, 'CustomerProductPriceAdjustment', cuid()]);

      adjustmentsModel.insert(key, req.payload)
        .then(model => reply(model).created(`${req.url.path}/${model.id}`), err => {
          console.error(err);
          reply.badImplementation();
        });
    },
    config: {
      tags: ['api'],
      auth: {
        strategy: 'jwt',
        scope: ['customer:{params.customerId}', 'admin']
      },
      validate: {
        params: {
          customerId: Joi.string().required().description('Customer identifier'),
          membershipId: Joi.string().required().description('Membership identifier')
        }
      },
      response: {
        status: Object.assign({
          201: Joi.object().description('The created adjustment').meta({className: 'ProductPriceAdjustment'})
        }, errorSchemas.statuses([401, 403, 404]))
      }
    }
  });

  next();
};

module.exports.register.attributes = {
  name: 'product_price_adjustments'
};
