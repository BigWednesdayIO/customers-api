'use strict';

const cuid = require('cuid');
const dataset = require('./dataset');
const entityStore = require('./entity_store');

const membershipKey = (customerId, membershipId) =>
  dataset.key(['Customer', customerId, 'Membership', membershipId]);

const membershipRepository = {
  create(customerId, membershipParams) {
    const membershipId = cuid();
    return entityStore.create(membershipKey(customerId, membershipId), membershipParams);
  },

  find(customerId) {
    const customerKey = dataset.key(['Customer', customerId]);
    const query = dataset.createQuery('Membership').hasAncestor(customerKey).order('_metadata_created');
    return entityStore.runQuery(query);
  },

  get(customerId, membershipId) {
    const key = dataset.key(['Customer', customerId, 'Membership', membershipId]);
    return entityStore.get(key);
  }
};

module.exports = membershipRepository;
