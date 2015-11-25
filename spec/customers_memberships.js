'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const expect = require('chai').expect;
const specRequest = require('./spec_request');
const signToken = require('./sign_jwt');

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
      expect(_.omit(createResponse.result, 'id')).to.eql(createParams);
      expect(createResponse.result.id).to.match(/^c.*/);
      expect(createResponse.result.id).to.have.length(25);
    });
  });
});
