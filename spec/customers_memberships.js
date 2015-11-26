'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const expect = require('chai').expect;
const specRequest = require('./spec_request');
const signToken = require('./sign_jwt');

const adminToken = signToken({scope: ['admin']});

describe('memberships', () => {
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

  describe('post', () => {
    const createParams = {
      supplier_id: 'supplier-a',
      membership_number: 'mem-123'
    };
    let createResponse;

    before(() => {
      return specRequest({
        url: `/customers/${customer.id}/memberships?token=${validToken}`,
        method: 'POST',
        payload: createParams
      })
      .then(response => {
        if (response.statusCode !== 201) {
          return console.error(response.result);
        }
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
      expect(_.omit(createResponse.result, ['id', '_metadata'])).to.eql(createParams);
      expect(createResponse.result.id).to.match(/^c.*/);
      expect(createResponse.result.id).to.have.length(25);
      expect(createResponse.result).to.have.deep.property('_metadata.created');
      expect(createResponse.result._metadata.created).to.be.instanceOf(Date);
    });

    it('returns 403 when requesting customer without correct scope', () => {
      const otherUsersToken = signToken({scope: ['customer:12345']});
      return specRequest({
        url: `/customers/${customer.id}/memberships?token=${otherUsersToken}`,
        method: 'POST',
        payload: createParams
      })
      .then(response => {
        expect(response.statusCode).to.equal(403);
        expect(response.result.message).match(/Insufficient scope/);
      });
    });

    it('returns 404 when customer does not exist', () => {
      return specRequest({
        url: `/customers/unknown_customer/memberships?token=${adminToken}`,
        method: 'POST',
        payload: {
          supplier_id: 'sdfklsdjflksadjflksdjaflkjsadflksd',
          membership_number: 'mem-123'
        }
      })
      .then(response => {
        expect(response.statusCode).to.equal(404);
        expect(response.result).to.have.property('message', 'Customer "unknown_customer" not found.');
      });
    });
  });
});
