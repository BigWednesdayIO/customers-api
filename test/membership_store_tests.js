'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const sinon = require('sinon');

const memberships = require('../lib/stores/membership_store');
const dataset = require('../lib/dataset');

const buildRawMembership = membership => ({
  key: {path: ['Customer', 'customer-a', 'Membership', membership.id]},
  data: Object.assign(
    {_metadata_created: membership._metadata.created},
    _.omit(membership, ['id', '_metadata']))
});

describe('Membership repository', () => {
  let sandbox;
  let saveStub;
  let deleteStub;
  let keySpy;

  const fakeCreatedTimestamp = 1448450346461;

  const existingMemberships = [{
    id: 'membership-a',
    supplier_id: 'supplier-a',
    membership_number: 'membership-a',
    _metadata: {created: new Date()}
  }, {
    id: 'membership-b',
    supplier_id: 'supplier-b',
    membership_number: 'membership-b',
    _metadata: {created: new Date()}
  }];

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    sandbox.useFakeTimers(fakeCreatedTimestamp);

    saveStub = sandbox.stub(dataset, 'save', (args, callback) => {
      callback();
    });

    keySpy = sandbox.spy(dataset, 'key');

    sandbox.stub(dataset, 'get', (args, callback) => {
      if (args.path[1] === 'customer-a') {
        const membership = _.find(existingMemberships, {id: _.last(args.path)});
        if (membership) {
          return callback(null, buildRawMembership(membership));
        }
      }

      callback();
    });

    deleteStub = sandbox.stub(dataset, 'delete', (args, callback) => {
      callback();
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('create', () => {
    const createParams = {
      supplier_id: 'supplier-c',
      membership_number: 'membership-c'
    };

    let createdMembership;

    beforeEach(() => {
      return memberships.create('customer-a', createParams)
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
    beforeEach(() => {
      sandbox.stub(dataset, 'createQuery', kind => {
        return {
          kind,
          hasAncestor(key) {
            this.ancestorKey = key;
            return this;
          },
          filter(field, value) {
            this.filtered = {field, value};
          },
          order(order) {
            this.sortOrder = order;
            return this;
          }
        };
      });

      sandbox.stub(dataset, 'runQuery', (query, callback) => {
        if (_.eq(query.ancestorKey.path, ['Customer', 'customer-a'])) {
          let results = existingMemberships;

          if (query.filtered) {
            results = results.filter(r => r[query.filtered.field.replace(' =', '')] === query.filtered.value);
          }

          callback(null, results.map(buildRawMembership));
        }

        callback(null, []);
      });
    });

    it('returns memberships by customer id', () => {
      return memberships
        .find('customer-a')
        .then(memberships => {
          expect(memberships).to.eql(existingMemberships);
        });
    });

    it('returns memberships by customer id and supplier id', () =>
      memberships
        .find('customer-a', 'supplier-b')
        .then(memberships => expect(memberships).to.eql(existingMemberships.slice(1))));

    it('returns empty array when no memberships are found', () => {
      return memberships
        .find('unknown')
        .then(memberships => {
          expect(memberships).to.eql([]);
        });
    });
  });

  describe('get', () => {
    it('returns membership by id', () => {
      return memberships
        .get('customer-a', 'membership-a')
        .then(membership => {
          expect(membership).to.eql(existingMemberships[0]);
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
    let updatedMembership;

    const updateParams = {
      supplier_id: 'supplier-b',
      membership_number: '088777364'
    };

    beforeEach(() => {
      return memberships
        .update('customer-a', 'membership-a', updateParams)
        .then(membership => {
          updatedMembership = membership;
        });
    });

    it('persists updated attributes', () => {
      sinon.assert.calledOnce(saveStub);
      const expectedKey = keySpy.returnValues[0];
      sinon.assert.calledWith(saveStub, sinon.match({
        key: expectedKey,
        method: 'update',
        data: updateParams
      }));
    });

    it('returns updated resource', () => {
      expect(updatedMembership).to.eql(Object.assign({
        id: existingMemberships[0].id,
        _metadata: existingMemberships[0]._metadata
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

  describe('delete', () => {
    it('deletes membership', () => {
      return memberships
        .delete('customer-a', 'membership-a')
        .then(() => {
          sinon.assert.calledOnce(deleteStub);
          const expectedKey = keySpy.returnValues[0];
          sinon.assert.calledWith(deleteStub, expectedKey);
        });
    });

    it('errors on non-existent customer', () => {
      return memberships
        .delete('unknown-customer', 'membership-a')
        .then(() => {
          throw new Error('Error expected');
        }, err => {
          expect(err.name).to.equal('EntityNotFoundError');
          expect(err instanceof Error).to.equal(true);
        });
    });

    it('errors on non-existent membership', () => {
      return memberships
        .delete('customer-a', 'unknown-membership')
        .then(() => {
          throw new Error('Error expected');
        }, err => {
          expect(err.name).to.equal('EntityNotFoundError');
          expect(err instanceof Error).to.equal(true);
        });
    });
  });
});
