'use strict';

const cuid = require('cuid');
const errorSchemas = require('hapi-error-schemas');
const Joi = require('joi');

const dataset = require('../dataset');
const adjustmentsModel = require('gcloud-datastore-model')(dataset);
const customers = require('../stores/customer_store');
const memberships = require('../stores/membership_store');

const baseAdjustmentAttributes = {
  linked_product_id: Joi.string().required().description('Identifier of the supplier linked product the price adjustment applies to'),
  type: Joi.string().valid(['value_override', 'value_adjustment', 'percentage_adjustment']).required().description('The type of adjustment'),
  amount: Joi.any().required().when('type', {is: 'value_adjustment', then: Joi.number().precision(2), otherwise: Joi.number().precision(2).positive()}).description('The percentage or value amount to adjust price by'),
  start_date: Joi.date().required().description('Date the price adjustment comes into effect'),
  end_date: Joi.date().description('Date the price adjustment ceases to have effect')
};

const requestSchema = Joi.object(baseAdjustmentAttributes).meta({className: 'ProductPriceAdjustmentParameters'});

const responseSchema = Joi.object(Object.assign({
  id: Joi.string().required().description('Adjustment identifier'),
  _metadata: Joi.object({
    created: Joi.date().required().description('Date the adjustment was created'),
    updated: Joi.date().required().description('Date the adjustment was last updated'),
    membership_id: Joi.string().description('Identifier of the membership that the adjustment is associated with')
  }).meta({className: 'ProductPriceAdjustmentMetadata'})
}, baseAdjustmentAttributes)).meta({className: 'ProductPriceAdjustment'});

const buildKey = (customerId, membershipId, adjustmentId) => {
  const key = dataset.key(['Customer', customerId, 'Membership', membershipId]);

  if (adjustmentId) {
    key.path.push('CustomerProductPriceAdjustment', adjustmentId);
  }

  return key;
};

const verifyCustomer = (req, reply) =>
  customers.get(req.params.customerId)
    .then(reply, err => {
      if (err.name === 'EntityNotFoundError') {
        return reply.notFound(`Customer "${req.params.customerId}" not found.`);
      }

      console.error(err);
      return reply.badImplementation();
    });

const verifyCustomerMembership = (req, reply) => {
  // parallel IO operations
  const getCustomer = customers.get(req.params.customerId);
  const getMembership = memberships.get(req.params.customerId, req.params.membershipId);

  getCustomer
    .then(() => getMembership, err => {
      const error = new Error('Get customer error');
      error.source = 'customer';
      error.internal = err;

      return error;
    })
    .then(result => {
      if (result instanceof Error && result.source === 'customer') {
        const err = result.internal;

        if (err.name === 'EntityNotFoundError') {
          return reply.notFound(`Customer "${req.params.customerId}" not found.`);
        }

        console.error(err);
        return reply.badImplementation();
      }

      reply();
    }, err => {
      if (err.name === 'EntityNotFoundError') {
        return reply.notFound(`Membership "${req.params.membershipId}" not found for Customer "${req.params.customerId}".`);
      }

      console.error(err);
      reply.badImplementation();
    });
};

module.exports.register = (server, options, next) => {
  server.route({
    path: '/customers/{customerId}/memberships/{membershipId}/product_price_adjustments',
    method: 'POST',
    handler(req, reply) {
      const key = buildKey(req.params.customerId, req.params.membershipId, cuid());

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
      pre: [{method: verifyCustomerMembership}],
      validate: {
        params: {
          customerId: Joi.string().required().description('Customer identifier'),
          membershipId: Joi.string().required().description('Membership identifier')
        },
        payload: requestSchema.description('The product price adjustment to create')
      },
      response: {
        status: Object.assign({
          201: responseSchema.description('The created adjustment')
        }, errorSchemas.statuses([401, 403, 404]))
      }
    }
  });

  server.route({
    path: '/customers/{customerId}/memberships/{membershipId}/product_price_adjustments',
    method: 'GET',
    handler(req, reply) {
      const membershipKey = buildKey(req.params.customerId, req.params.membershipId);
      const query = dataset.createQuery('CustomerProductPriceAdjustment').hasAncestor(membershipKey).order('_metadata_created');

      if (req.query.linked_product_id) {
        query.filter('linked_product_id =', req.query.linked_product_id);
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
      pre: [{method: verifyCustomerMembership}],
      validate: {
        params: {
          customerId: Joi.string().required().description('Customer identifier'),
          membershipId: Joi.string().required().description('Membership identifier')
        },
        query: {
          linked_product_id: Joi.string().description('Product identifier to filter on')
        }
      },
      response: {
        status: Object.assign({
          200: Joi.array().items(responseSchema).description('Price adjustments')
        }, errorSchemas.statuses([401, 403, 404]))
      }
    }
  });

  server.route({
    path: '/customers/{customerId}/memberships/{membershipId}/product_price_adjustments/{id}',
    method: 'GET',
    handler(req, reply) {
      const key = buildKey(req.params.customerId, req.params.membershipId, req.params.id);

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
      pre: [{method: verifyCustomerMembership}],
      validate: {
        params: {
          customerId: Joi.string().required().description('Customer identifier'),
          membershipId: Joi.string().required().description('Membership identifier'),
          id: Joi.string().required().description('Product price adjustment identifier')
        }
      },
      response: {
        status: Object.assign({
          200: responseSchema.description('The created adjustment')
        }, errorSchemas.statuses([401, 403, 404]))
      }
    }
  });

  server.route({
    path: '/customers/{customerId}/product_price_adjustments',
    method: 'GET',
    handler(req, reply) {
      const customerKey = dataset.key(['Customer', req.params.customerId]);

      // datastore requires first sort property to be the filter property when operator is not equals
      const query = dataset.createQuery('CustomerProductPriceAdjustment')
        .hasAncestor(customerKey)
        .filter('start_date <=', req.query.date)
        .order('start_date')
        .order('_metadata_created');

      adjustmentsModel.find(query)
        .then(startedAdjustments => {
          // datastore cannot query on end date being null OR after requested date, so filter here before replying
          const adjustments = startedAdjustments
            .filter(a => !a.end_date || a.end_date >= req.query.date)
            .map(a => {
              const mapped = Object.assign({}, a);
              mapped._metadata.membership_id = a._key.path[3];

              return mapped;
            });

          reply(adjustments);
        }, err => {
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
      pre: [{method: verifyCustomer}],
      validate: {
        params: {
          customerId: Joi.string().required().description('Customer identifier')
        },
        query: {
          date: Joi.date().required().description('Date for filtering adjustments')
        }
      },
      response: {
        status: Object.assign({
          200: Joi.array().items(responseSchema).description('Price adjustments')
        }, errorSchemas.statuses([401, 403, 404]))
      }
    }
  });

  server.route({
    path: '/customers/{customerId}/memberships/{membershipId}/product_price_adjustments/{id}',
    method: 'DELETE',
    handler(req, reply) {
      const key = buildKey(req.params.customerId, req.params.membershipId, req.params.id);

      adjustmentsModel.delete(key)
        .then(() => reply().code(204), err => {
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
      pre: [{method: verifyCustomerMembership}],
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
      const key = buildKey(req.params.customerId, req.params.membershipId, req.params.id);

      adjustmentsModel.update(key, req.payload)
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
      pre: [{method: verifyCustomerMembership}],
      validate: {
        params: {
          customerId: Joi.string().required().description('Customer identifier'),
          membershipId: Joi.string().required().description('Membership identifier'),
          id: Joi.string().required().description('Product price adjustment identifier')
        },
        payload: requestSchema.description('The product price adjustment to create')
      },
      response: {
        status: Object.assign({
          200: responseSchema.description('The updated adjustment')
        }, errorSchemas.statuses([401, 403, 404]))
      }
    }
  });

  next();
};

module.exports.register.attributes = {
  name: 'product_price_adjustments'
};
