'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const expect = require('chai').expect;
const specRequest = require('./spec_request');
const signToken = require('./sign_jwt');

const adminToken = signToken({scope: ['admin']});

const membershipParameters = require('./parameters/membership');

describe('/customers/{customerId}/memberships/{membershipId}', () => {
  let customer;
  let validToken;

  before(() => {
    return specRequest({
      url: '/customers',
      method: 'POST',
      payload: {email: `test-${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'}
    })
    .then(response => {
      customer = response.result;
      validToken = signToken({scope: [`customer:${customer.id}`]});
    });
  });

  describe('get', () => {
    let existingMembership;
    let getResponse;

    before(() => {
      return specRequest({
        url: `/customers/${customer.id}/memberships`,
        method: 'POST',
        payload: membershipParameters,
        headers: {authorization: validToken}
      })
      .then(response => {
        existingMembership = response.result;

        return specRequest({
          url: `/customers/${customer.id}/memberships/${existingMembership.id}`,
          method: 'GET',
          headers: {authorization: validToken}
        });
      })
      .then(response => {
        getResponse = response;
      });
    });

    it('returns http 200', () => {
      expect(getResponse.statusCode).to.equal(200);
    });

    it('returns membership resource', () => {
      expect(getResponse.result).to.eql(existingMembership);
    });

    it('returns 403 when requesting memberships without correct scope', () => {
      const otherUsersToken = signToken({scope: ['customer:12345']});
      return specRequest({
        url: `/customers/${customer.id}/memberships/${existingMembership.id}`,
        method: 'GET',
        headers: {authorization: otherUsersToken}
      })
      .then(response => {
        expect(response.statusCode).to.equal(403);
        expect(response.result.message).match(/Insufficient scope/);
      });
    });

    it('returns 404 when membership does not exist', () => {
      return specRequest({
        url: `/customers/${customer.id}/memberships/unkown_membership`,
        method: 'GET',
        headers: {authorization: validToken}
      })
      .then(response => {
        expect(response.statusCode).to.equal(404);
        expect(response.result).to.have.property('message', 'Membership "unkown_membership" not found.');
      });
    });

    describe('admin', () => {
      it('gets memberships for any customer', () => {
        return specRequest({
          url: `/customers/${customer.id}/memberships/${existingMembership.id}`,
          method: 'GET',
          headers: {authorization: adminToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(200);
        });
      });

      it('returns 404 when customer does not exist', () => {
        return specRequest({
          url: `/customers/unknown_customer/memberships/${existingMembership.id}`,
          method: 'GET',
          headers: {authorization: adminToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Customer "unknown_customer" not found.');
        });
      });
    });
  });

  describe('put', () => {
    let existingMembership;
    let updateResponse;

    const updateParams = Object.assign({}, membershipParameters, {membership_number: 'mem-456'});

    before(() => {
      return specRequest({
        url: `/customers/${customer.id}/memberships`,
        method: 'POST',
        payload: membershipParameters,
        headers: {authorization: validToken}
      })
      .then(response => {
        existingMembership = response.result;

        return specRequest({
          url: `/customers/${customer.id}/memberships/${existingMembership.id}`,
          method: 'PUT',
          payload: updateParams,
          headers: {authorization: validToken}
        });
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
        id: existingMembership.id,
        _metadata: existingMembership._metadata
      }, updateParams);

      expect(updateResponse.result).to.eql(expected);
    });

    it('persists updates', () => {
      return specRequest({
        url: `/customers/${customer.id}/memberships/${existingMembership.id}`,
        method: 'GET',
        headers: {authorization: validToken}
      })
      .then(getResponse => {
        expect(updateResponse.result).to.eql(getResponse.result);
      });
    });

    it('returns 403 when updating membership without correct scope', () => {
      const otherUsersToken = signToken({scope: ['customer:12345']});
      return specRequest({
        url: `/customers/${customer.id}/memberships/${existingMembership.id}`,
        method: 'PUT',
        payload: updateParams,
        headers: {authorization: otherUsersToken}
      })
      .then(response => {
        expect(response.statusCode).to.equal(403);
        expect(response.result.message).match(/Insufficient scope/);
      });
    });

    it('returns 404 when membership does not exist', () => {
      return specRequest({
        url: `/customers/${customer.id}/memberships/unknown_membership`,
        method: 'PUT',
        payload: updateParams,
        headers: {authorization: validToken}
      })
      .then(response => {
        expect(response.statusCode).to.equal(404);
        expect(response.result).to.have.property('message', 'Membership "unknown_membership" not found.');
      });
    });

    describe('admin', () => {
      it('updates any membership', () => {
        return specRequest({
          url: `/customers/${customer.id}/memberships/${existingMembership.id}`,
          method: 'PUT',
          payload: updateParams,
          headers: {authorization: adminToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(200);
        });
      });

      it('returns 404 when customer does not exist', () => {
        return specRequest({
          url: `/customers/unknown_customer/memberships/${existingMembership.id}`,
          method: 'PUT',
          payload: updateParams,
          headers: {authorization: adminToken}
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
          url: `/customers/${customer.id}/memberships/${existingMembership.id}`,
          method: 'PUT',
          payload: _.omit(updateParams, 'supplier_id'),
          headers: {authorization: validToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', 'child "supplier_id" fails because ["supplier_id" is required]');
        });
      });

      it('requires supplier membership number', () => {
        return specRequest({
          url: `/customers/${customer.id}/memberships/${existingMembership.id}`,
          method: 'PUT',
          payload: _.omit(updateParams, 'membership_number'),
          headers: {authorization: validToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', 'child "membership_number" fails because ["membership_number" is required]');
        });
      });

      it('rejects request when price_adjustment_group_id is not a string', () => {
        return specRequest({
          url: `/customers/${customer.id}/memberships/${existingMembership.id}`,
          method: 'PUT',
          payload: Object.assign({}, updateParams, {price_adjustment_group_id: 1}),
          headers: {authorization: validToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', 'child "price_adjustment_group_id" fails because ["price_adjustment_group_id" must be a string]');
        });
      });
    });
  });

  describe('delete', () => {
    let existingMembership;

    before(() => {
      return specRequest({
        url: `/customers/${customer.id}/memberships`,
        method: 'POST',
        payload: membershipParameters,
        headers: {authorization: validToken}
      })
      .then(response => {
        existingMembership = response.result;
      });
    });

    it('returns http 204', () => {
      return specRequest({
        url: `/customers/${customer.id}/memberships/${existingMembership.id}`,
        method: 'DELETE',
        headers: {authorization: validToken}
      })
      .then(response => expect(response.statusCode).to.equal(204));
    });

    it('returns 403 when updating membership without correct scope', () => {
      const otherUsersToken = signToken({scope: ['customer:12345']});
      return specRequest({
        url: `/customers/unknown_customer/memberships/${existingMembership.id}`,
        method: 'DELETE',
        headers: {authorization: otherUsersToken}
      })
      .then(response => {
        expect(response.statusCode).to.equal(403);
        expect(response.result.message).match(/Insufficient scope/);
      });
    });

    it('returns http 404 when membership does not exist', () => {
      return specRequest({
        url: `/customers/${customer.id}/memberships/unknown_membership`,
        method: 'DELETE',
        headers: {authorization: validToken}
      })
      .then(response => {
        expect(response.statusCode).to.equal(404);
        expect(response.result).to.have.property('message', 'Membership "unknown_membership" not found.');
      });
    });

    describe('admin', () => {
      it('deletes any membership', () => {
        return specRequest({
          url: `/customers/${customer.id}/memberships`,
          method: 'POST',
          payload: membershipParameters,
          headers: {authorization: validToken}
        })
        .then(response => {
          return specRequest({
            url: `/customers/${customer.id}/memberships/${response.result.id}`,
            method: 'DELETE',
            headers: {authorization: adminToken}
          });
        })
        .then(response => {
          expect(response.statusCode).to.equal(204);
        });
      });

      it('returns 404 when customer does not exist', () => {
        return specRequest({
          url: `/customers/unknown_customer/memberships/${existingMembership.id}`,
          method: 'DELETE',
          headers: {authorization: adminToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Customer "unknown_customer" not found.');
        });
      });
    });
  });
});
