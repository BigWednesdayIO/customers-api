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

  server.route({
    path: '/customers/{customerId}/memberships/{membershipId}/product_price_adjustments',
    method: 'GET',
    handler(req, reply) {
      const membershipKey = dataset.key(['Customer', req.params.customerId, 'Membership', req.params.membershipId]);
      const query = dataset.createQuery('CustomerProductPriceAdjustment').hasAncestor(membershipKey).order('_metadata_created');

      if (req.query.product_id) {
        query.filter('product_id =', req.query.product_id);
      }

      adjustmentsModel.find(query)
        .then(reply, err => {
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
        },
        query: {
          product_id: Joi.string().description('Product identifier to filter on')
        }
      },
      response: {
        status: Object.assign({
          200: Joi.array().description('Price adjustments')
        }, errorSchemas.statuses([401, 403, 404]))
      }
    }
  });

  server.route({
    path: '/customers/{customerId}/memberships/{membershipId}/product_price_adjustments/{id}',
    method: 'GET',
    handler(req, reply) {
      const key = dataset.key(['Customer', req.params.customerId, 'Membership', req.params.membershipId, 'CustomerProductPriceAdjustment', req.params.id]);
      adjustmentsModel.get(key)
        .then(reply, err => {
          if (err.name === 'EntityNotFoundError') {
            return reply.notFound();
          }

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
          membershipId: Joi.string().required().description('Membership identifier'),
          id: Joi.string().required().description('Product price adjustment identifier')
        }
      },
      response: {
        status: Object.assign({
          200: Joi.object().description('The created adjustment').meta({className: 'ProductPriceAdjustment'})
        }, errorSchemas.statuses([401, 403, 404]))
      }
    }
  });

  server.route({
    path: '/customers/{customerId}/memberships/{membershipId}/product_price_adjustments/{id}',
    method: 'DELETE',
    handler(req, reply) {
      const key = dataset.key(['Customer', req.params.customerId, 'Membership', req.params.membershipId, 'CustomerProductPriceAdjustment', req.params.id]);

      adjustmentsModel.delete(key)
        .then(() => reply().code(204), err => {
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
          membershipId: Joi.string().required().description('Membership identifier'),
          id: Joi.string().required().description('Product price adjustment identifier')
        }
      },
      response: {
        status: errorSchemas.statuses([401, 403, 404])
      }
    }
  });

  server.route({
    path: '/customers/{customerId}/memberships/{membershipId}/product_price_adjustments/{id}',
    method: 'PUT',
    handler(req, reply) {
      const key = dataset.key(['Customer', req.params.customerId, 'Membership', req.params.membershipId, 'CustomerProductPriceAdjustment', req.params.id]);

      adjustmentsModel.update(key, req.payload)
        .then(reply, err => {
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
          membershipId: Joi.string().required().description('Membership identifier'),
          id: Joi.string().required().description('Product price adjustment identifier')
        }
      },
      response: {
        status: Object.assign({
          200: Joi.object().description('The updated adjustment').meta({className: 'ProductPriceAdjustment'})
        }, errorSchemas.statuses([401, 403, 404]))
      }
    }
  });

  next();
};

module.exports.register.attributes = {
  name: 'product_price_adjustments'
};
