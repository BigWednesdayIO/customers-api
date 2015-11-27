'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const expect = require('chai').expect;
const specRequest = require('./spec_request');
const signToken = require('./sign_jwt');

const adminToken = signToken({scope: ['admin']});

describe('/customers/{customerId}/memberships/{membershipId}', () => {
  let customer;
  let validToken;
  let createResponse;

  const createParams = {
    supplier_id: 'supplier-a',
    membership_number: 'mem-123'
  };

  before(() => {
    return specRequest({
      url: '/customers',
      method: 'POST',
      payload: {email: `test-${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'}
    })
    .then(response => {
      customer = response.result;
      validToken = signToken({scope: [`customer:${customer.id}`]});

      return specRequest({
        url: `/customers/${customer.id}/memberships?token=${validToken}`,
        method: 'POST',
        payload: createParams
      });
    })
    .then(response => {
      createResponse = response;
    });
  });

  describe('get', () => {
    let getResponse;

    before(() => {
      return specRequest({
        url: `/customers/${customer.id}/memberships/${createResponse.result.id}?token=${validToken}`,
        method: 'GET'
      })
      .then(response => {
        getResponse = response;
      });
    });

    it('returns http 200', () => {
      expect(getResponse.statusCode).to.equal(200);
    });

    it('returns membership resource', () => {
      expect(getResponse.result).to.eql(createResponse.result);
    });

    it('returns 403 when requesting memberships without correct scope', () => {
      const otherUsersToken = signToken({scope: ['customer:12345']});
      return specRequest({
        url: `/customers/${customer.id}/memberships/${createResponse.result.id}?token=${otherUsersToken}`,
        method: 'GET'
      })
      .then(response => {
        expect(response.statusCode).to.equal(403);
        expect(response.result.message).match(/Insufficient scope/);
      });
    });

    it('returns 404 when membership does not exist', () => {
      return specRequest({
        url: `/customers/${customer.id}/memberships/unkown_membership?token=${validToken}`,
        method: 'GET'
      })
      .then(response => {
        expect(response.statusCode).to.equal(404);
        expect(response.result).to.have.property('message', 'Membership "unkown_membership" not found.');
      });
    });

    describe('admin', () => {
      it('gets memberships for any customer', () => {
        return specRequest({
          url: `/customers/${customer.id}/memberships/${createResponse.result.id}?token=${adminToken}`,
          method: 'GET'
        })
        .then(response => {
          expect(response.statusCode).to.equal(200);
        });
      });

      it('returns 404 when customer does not exist', () => {
        return specRequest({
          url: `/customers/unknown_customer/memberships/${createResponse.result.id}?token=${adminToken}`,
          method: 'GET'
        })
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Customer "unknown_customer" not found.');
        });
      });
    });
  });

  describe('put', () => {
    const updateParams = {
      supplier_id: 'supplier-b',
      membership_number: 'mem-456'
    };

    let updateResponse;

    before(() => {
      return specRequest({
        url: `/customers/${customer.id}/memberships/${createResponse.result.id}?token=${validToken}`,
        method: 'PUT',
        payload: updateParams
      })
      .then(response => {
        updateResponse = response;
      });
    });

    it('returns http 200', () => {
      expect(updateResponse.statusCode).to.equal(200);
    });

    it('returns the updated membership resource', () => {
      const expected = Object.assign({
        id: createResponse.result.id,
        _metadata: createResponse.result._metadata
      }, updateParams);

      expect(updateResponse.result).to.eql(expected);
    });

    it('persists updates', () => {
      return specRequest({url: `/customers/${customer.id}/memberships/${createResponse.result.id}?token=${validToken}`, method: 'GET'})
        .then(getResponse => {
          expect(updateResponse.result).to.eql(getResponse.result);
        });
    });

    it('returns 403 when updating membership without correct scope', () => {
      const otherUsersToken = signToken({scope: ['customer:12345']});
      return specRequest({
        url: `/customers/${customer.id}/memberships/${createResponse.result.id}?token=${otherUsersToken}`,
        method: 'PUT',
        payload: updateParams
      })
      .then(response => {
        expect(response.statusCode).to.equal(403);
        expect(response.result.message).match(/Insufficient scope/);
      });
    });

    it('returns 404 when membership does not exist', () => {
      return specRequest({
        url: `/customers/${customer.id}/memberships/unknown_membership?token=${validToken}`,
        method: 'PUT',
        payload: updateParams
      })
      .then(response => {
        expect(response.statusCode).to.equal(404);
        expect(response.result).to.have.property('message', 'Membership "unknown_membership" not found.');
      });
    });

    describe('admin', () => {
      it('updates any membership', () => {
        return specRequest({
          url: `/customers/${customer.id}/memberships/${createResponse.result.id}?token=${adminToken}`,
          method: 'PUT',
          payload: updateParams
        })
        .then(response => {
          expect(response.statusCode).to.equal(200);
        });
      });

      it('returns 404 when customer does not exist', () => {
        return specRequest({
          url: `/customers/unknown_customer/memberships/${createResponse.result.id}?token=${adminToken}`,
          method: 'PUT',
          payload: updateParams
        })
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Customer "unknown_customer" not found.');
        });
      });
    });

    describe('validation', () => {
      it('requires supplier id', () => {
        return specRequest({
          url: `/customers/${customer.id}/memberships/${createResponse.result.id}?token=${validToken}`,
          method: 'PUT',
          payload: _.omit(updateParams, 'supplier_id')
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', 'child "supplier_id" fails because ["supplier_id" is required]');
        });
      });

      it('requires supplier membership number', () => {
        return specRequest({
          url: `/customers/${customer.id}/memberships/${createResponse.result.id}?token=${validToken}`,
          method: 'PUT',
          payload: _.omit(updateParams, 'membership_number')
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', 'child "membership_number" fails because ["membership_number" is required]');
        });
      });
    });
  });
});
