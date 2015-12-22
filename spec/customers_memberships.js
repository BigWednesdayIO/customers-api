'use strict';

const _ = require('lodash');
const bluebird = require('bluebird');
const cuid = require('cuid');
const expect = require('chai').expect;
const specRequest = require('./spec_request');
const signToken = require('./sign_jwt');

const adminToken = signToken({scope: ['admin']});

const membershipParameters = require('./parameters/membership');

const createCustomer = () => {
  return specRequest({
    url: '/customers',
    method: 'POST',
    payload: {email: `test-${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'}
  })
  .then(response => ({
    id: response.result.id,
    token: signToken({scope: [`customer:${response.result.id}`]})
  }));
};

describe('/customers/{id}/memberships', () => {
  describe('post', () => {
    let customer;
    let createResponse;

    before(() => {
      return createCustomer()
        .then(created => {
          customer = created;
          return specRequest({
            url: `/customers/${customer.id}/memberships`,
            method: 'POST',
            payload: membershipParameters,
            headers: {authorization: customer.token}
          });
        })
        .then(response => {
          createResponse = response;
        });
    });

    it('returns http 201', () => {
      expect(createResponse.statusCode).to.equal(201);
    });

    it('provides created resource location', () => {
      expect(createResponse.headers.location)
        .to.equal(`/customers/${customer.id}/memberships/${createResponse.result.id}`);
    });

    it('returns membership resource', () => {
      expect(_.omit(createResponse.result, ['id', '_metadata'])).to.eql(membershipParameters);
      expect(createResponse.result.id).to.match(/^c.{24}/);
      expect(createResponse.result._metadata.created).to.be.instanceOf(Date);
    });

    it('returns 403 when requesting customer without correct scope', () => {
      const otherUsersToken = signToken({scope: ['customer:12345']});
      return specRequest({
        url: `/customers/${customer.id}/memberships`,
        method: 'POST',
        payload: membershipParameters,
        headers: {authorization: otherUsersToken}
      })
      .then(response => {
        expect(response.statusCode).to.equal(403);
        expect(response.result.message).match(/Insufficient scope/);
      });
    });

    describe('admin', () => {
      it('creates membership for any customer', () => {
        return specRequest({
          url: `/customers/${customer.id}/memberships`,
          method: 'POST',
          payload: membershipParameters,
          headers: {authorization: adminToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(201);
        });
      });

      it('returns 404 when customer does not exist', () => {
        return specRequest({
          url: `/customers/unknown_customer/memberships`,
          method: 'POST',
          payload: membershipParameters,
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
          url: `/customers/${customer.id}/memberships`,
          method: 'POST',
          payload: _.omit(membershipParameters, 'supplier_id'),
          headers: {authorization: customer.token}
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', 'child "supplier_id" fails because ["supplier_id" is required]');
        });
      });

      it('requires supplier membership number', () => {
        return specRequest({
          url: `/customers/${customer.id}/memberships`,
          method: 'POST',
          payload: _.omit(membershipParameters, 'membership_number'),
          headers: {authorization: customer.token}
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', 'child "membership_number" fails because ["membership_number" is required]');
        });
      });
    });
  });

  describe('get', () => {
    const memberships = [
      Object.assign({}, membershipParameters, {supplier_id: 'supplier-a', membership_number: 'mem-123'}),
      Object.assign({}, membershipParameters, {supplier_id: 'supplier-b', membership_number: 'mem-456'}),
      Object.assign({}, membershipParameters, {supplier_id: 'supplier-c', membership_number: 'mem-789'})
    ];
    let customer;
    let getResponse;

    before(() => {
      return createCustomer()
      .then(created => {
        customer = created;
        return bluebird.mapSeries(
          memberships,
          membership => specRequest({
            url: `/customers/${customer.id}/memberships`,
            method: 'POST',
            payload: membership,
            headers: {authorization: customer.token}
          })
        );
      })
      .then(() => specRequest({
        url: `/customers/${customer.id}/memberships`,
        method: 'GET',
        headers: {authorization: customer.token}
      }))
      .then(response => {
        getResponse = response;
      });
    });

    it('returns http 200', () => {
      expect(getResponse.statusCode).to.equal(200);
    });

    it('returns all membership resources', () => {
      getResponse.result.forEach(membership => {
        expect(membership.id).to.match(/^c.{24}/);
        expect(membership._metadata.created).to.be.instanceOf(Date);
      });
      expect(getResponse.result.map(r => _.omit(r, ['id', '_metadata']))).to.deep.equal(memberships);
    });

    it('returns 403 when requesting customer without correct scope', () => {
      const otherUsersToken = signToken({scope: ['customer:12345']});
      return specRequest({
        url: `/customers/${customer.id}/memberships`,
        method: 'GET',
        headers: {authorization: otherUsersToken}
      })
      .then(response => {
        expect(response.statusCode).to.equal(403);
        expect(response.result.message).match(/Insufficient scope/);
      });
    });

    describe('admin', () => {
      it('gets memberships for any customer', () => {
        return specRequest({
          url: `/customers/${customer.id}/memberships`,
          method: 'GET',
          headers: {authorization: adminToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(200);
        });
      });

      it('returns 404 when customer does not exist', () => {
        return specRequest({
          url: '/customers/unknown_customer/memberships',
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
});
