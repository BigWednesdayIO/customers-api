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
  }
};

module.exports = membershipRepository;
