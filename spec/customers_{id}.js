'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const expect = require('chai').expect;
const specRequest = require('./spec_request');

describe('/customers/{id}', () => {
  describe('get', () => {
    const createCustomerPayload = {email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'};
    let createResponse;
    let getResponse;

    before(() => {
      return specRequest({url: '/customers', method: 'POST', payload: createCustomerPayload})
        .then(response => {
          expect(response.statusCode).to.equal(201);
          createResponse = response;
          return specRequest({url: response.headers.location, method: 'GET'});
        })
        .then(response => {
          getResponse = response;
        });
    });

    it('returns http 200 when customer is found', () => {
      expect(getResponse.statusCode).to.equal(200);
    });

    it('returns the customer resource', () => {
      expect(getResponse.result).to.eql(_.omit(createResponse.result, 'token'));
    });
  });
});
