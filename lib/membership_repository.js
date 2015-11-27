'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const dataset = require('./dataset');
const entityStore = require('./entity_store');

const membershipKey = (customerId, membershipId) =>
  dataset.key(['Customer', customerId, 'Membership', membershipId]);

const membershipRepository = {
  create(customerId, attributes) {
    const membershipId = cuid();
    return entityStore.create(membershipKey(customerId, membershipId), attributes);
  },

  find(customerId) {
    const customerKey = dataset.key(['Customer', customerId]);
    const query = dataset.createQuery('Membership').hasAncestor(customerKey).order('_metadata_created');
    return entityStore.runQuery(query);
  },

  get(customerId, membershipId) {
    const key = dataset.key(['Customer', customerId, 'Membership', membershipId]);
    return entityStore.get(key);
  },

  update(customerId, membershipId, attributes) {
    const key = dataset.key(['Customer', customerId, 'Membership', membershipId]);

    return this.get(customerId, membershipId)
      .then(membership => {
        return entityStore.update(key, Object.assign(_.pick(membership, '_metadata'), attributes));
      });
  }
};

module.exports = membershipRepository;
