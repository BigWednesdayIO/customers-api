'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const sinon = require('sinon');

const membershipRepository = require('../lib/membership_repository');
const dataset = require('../lib/dataset');

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

      return membershipRepository.create('cust-a', createParams)
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
});
