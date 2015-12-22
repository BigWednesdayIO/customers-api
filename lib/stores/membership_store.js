'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const dataset = require('../dataset');
const entityStore = require('./entity_store');

const membershipKey = (customerId, membershipId) =>
  dataset.key(['Customer', customerId, 'Membership', membershipId]);

const membershipRepository = {
  create(customerId, attributes) {
    const membershipId = cuid();
    return entityStore.create(membershipKey(customerId, membershipId), attributes);
  },

  find(customerId, supplierId) {
    const customerKey = dataset.key(['Customer', customerId]);
    const query = dataset.createQuery('Membership').hasAncestor(customerKey).order('_metadata_created');

    if (supplierId) {
      query.filter('supplier_id =', supplierId);
    }

    return entityStore.runQuery(query);
  },

  get(customerId, membershipId) {
    return entityStore.get(membershipKey(customerId, membershipId));
  },

  update(customerId, membershipId, attributes) {
    const key = membershipKey(customerId, membershipId);

    return entityStore.get(key)
      .then(membership => entityStore.update(key, Object.assign(_.pick(membership, '_metadata'), attributes)));
  },

  delete(customerId, membershipId) {
    const key = membershipKey(customerId, membershipId);
    return entityStore.get(key)
      .then(() => entityStore.delete(key));
  }
};

module.exports = membershipRepository;
