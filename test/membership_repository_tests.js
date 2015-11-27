'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const sinon = require('sinon');

const memberships = require('../lib/membership_repository');
const dataset = require('../lib/dataset');

const buildRawMembership = membership => ({
  key: {path: ['Customer', 'customer-a', 'Membership', membership.id]},
  data: Object.assign(
    {_metadata_created: membership._metadata.created},
    _.omit(membership, ['id', '_metadata']))
});

describe('Membership repository', () => {
  let sandbox;
  const fakeCreatedTimestamp = 1448450346461;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    sandbox.useFakeTimers(fakeCreatedTimestamp);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('create', () => {
    const createParams = {
      supplier_id: 'supplier-a',
      membership_number: 'mem-a'
    };

    let saveStub;
    let keySpy;
    let createdMembership;

    beforeEach(() => {
      saveStub = sandbox.stub(dataset, 'save', (args, callback) => {
        callback();
      });

      keySpy = sandbox.spy(dataset, 'key');

      return memberships.create('cust-a', createParams)
        .then(result => {
          createdMembership = result;
        });
    });

    it('persists membership', () => {
      sinon.assert.calledOnce(saveStub);
      const expectedKey = keySpy.returnValues[0];
      sinon.assert.calledWith(saveStub, sinon.match({key: expectedKey, method: 'insert', data: createParams}));
    });

    it('returns membership attributes', () => {
      expect(_.omit(createdMembership, ['id', '_metadata'])).to.eql(createParams);
    });

    it('returns id', () => {
      expect(createdMembership.id).to.match(/^c.*/);
      expect(createdMembership.id).to.have.length(25);
    });

    it('returns created date', () => {
      expect(createdMembership._metadata).to.be.ok;
      expect(createdMembership._metadata.created).to.eql(new Date(fakeCreatedTimestamp));
    });
  });

  describe('find', () => {
    const existingMemberships = [{
      id: 'membership-a',
      supplier_id: 'supplier-a',
      membership_number: '0903309455',
      _metadata: {created: new Date()}
    }, {
      id: 'membership-b',
      supplier_id: 'supplier-b',
      membership_number: '9834908493834',
      _metadata: {created: new Date()}
    }];

    beforeEach(() => {
      sandbox.stub(dataset, 'createQuery', kind => {
        return {
          kind,
          hasAncestor(key) {
            this.ancestorKey = key;
            return this;
          },
          order(order) {
            this.sortOrder = order;
            return this;
          }
        };
      });

      sandbox.stub(dataset, 'runQuery', (query, callback) => {
        if (_.eq(query.ancestorKey.path, ['Customer', 'customer-a'])) {
          callback(null, existingMemberships.map(buildRawMembership));
        }

        callback(null, []);
      });
    });

    it('returns membership by id', () => {
      return memberships
        .find('customer-a')
        .then(memberships => {
          expect(memberships).to.eql(existingMemberships);
        });
    });

    it('returns empty array for non-existent customer', () => {
      return memberships
        .find('unknown')
        .then(memberships => {
          expect(memberships).to.eql([]);
        });
    });
  });

  describe('get', () => {
    const existingMembership = {
      id: 'membership-a',
      supplier_id: 'supplier-a',
      membership_number: '0903309455',
      _metadata: {created: new Date()}
    };

    beforeEach(() => {
      sandbox.stub(dataset, 'get', (args, callback) => {
        if (args.path[1] === 'customer-a' && args.path[3] === 'membership-a') {
          return callback(null, buildRawMembership(existingMembership));
        }

        callback();
      });
    });

    it('returns membership by id', () => {
      return memberships
        .get('customer-a', 'membership-a')
        .then(membership => {
          expect(membership).to.eql(existingMembership);
        });
    });

    it('errors on non-existent customer', () => {
      return memberships
        .get('unknown', 'membership-a')
        .then(() => {
          throw new Error('Error expected');
        }, err => {
          expect(err.name).to.equal('EntityNotFoundError');
          expect(err instanceof Error).to.equal(true);
        });
    });

    it('errors on non-existent membership', () => {
      return memberships
        .get('customer-a', 'unknown')
        .then(() => {
          throw new Error('Error expected');
        }, err => {
          expect(err.name).to.equal('EntityNotFoundError');
          expect(err instanceof Error).to.equal(true);
        });
    });
  });

  describe('update', () => {
    let saveStub;
    let updatedMembership;

    const existingMembership = {
      id: 'membership-a',
      supplier_id: 'supplier-a',
      membership_number: '0903309455',
      _metadata: {created: new Date()}
    };
    const updateParams = {
      supplier_id: 'supplier-b',
      membership_number: '088777364'
    };

    beforeEach(() => {
      sandbox.stub(dataset, 'get', (args, callback) => {
        const membershipAPath = ['Customer', 'customer-a', 'Membership', 'membership-a'];

        if (_.eq(args.path, membershipAPath)) {
          return callback(null, {
            key: {path: membershipAPath},
            data: Object.assign(
              {_metadata_created: existingMembership._metadata.created},
              _.omit(existingMembership, ['id', '_metadata']))
          });
        }

        callback();
      });

      saveStub = sandbox.stub(dataset, 'save', (args, callback) => {
        callback();
      });

      return memberships
        .update('customer-a', 'membership-a', updateParams)
        .then(membership => {
          updatedMembership = membership;
        });
    });

    it('persists updated attributes', () => {
      sinon.assert.calledOnce(saveStub);
      sinon.assert.calledWith(saveStub, sinon.match({
        key: dataset.key(['Customer', 'customer-a', 'Membership', 'membership-a']),
        method: 'update',
        data: updateParams
      }));
    });

    it('returns updated resource', () => {
      expect(updatedMembership).to.eql(Object.assign({
        id: existingMembership.id,
        _metadata: existingMembership._metadata
      }, updateParams));
    });

    it('errors on non-existent customer', () => {
      return memberships
        .update('unknown-customer', 'membership-a', updateParams)
        .then(() => {
          throw new Error('Error expected');
        }, err => {
          expect(err.name).to.equal('EntityNotFoundError');
          expect(err instanceof Error).to.equal(true);
        });
    });

    it('errors on non-existent membership', () => {
      return memberships
        .update('customer-a', 'unknown-membership', updateParams)
        .then(() => {
          throw new Error('Error expected');
        }, err => {
          expect(err.name).to.equal('EntityNotFoundError');
          expect(err instanceof Error).to.equal(true);
        });
    });
  });
});
