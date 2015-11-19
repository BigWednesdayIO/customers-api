'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const expect = require('chai').expect;
const specRequest = require('./spec_request');

describe('/customers/{id}', () => {
  describe('get', () => {
    let createResponse;
    let getResponse;

    before(() => {
      return specRequest({
        url: '/customers',
        method: 'POST',
        payload: {email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'}
      })
      .then(response => {
        expect(response.statusCode).to.equal(201);
        createResponse = response;
        return specRequest({url: response.headers.location, method: 'GET'});
      })
      .then(response => {
        if (response.statusCode !== 200) {
          return console.error(response.result);
        }
        getResponse = response;
      });
    });

    it('returns http 200 when customer is found', () => {
      expect(getResponse.statusCode).to.equal(200);
    });

    it('returns the customer resource', () => {
      expect(getResponse.result).to.eql(createResponse.result);
    });

    it('returns 404 when customer does not exist', () => {
      return specRequest({url: '/customers/unknown', method: 'GET'})
        .then(response => {
          expect(response.statusCode).to.equal(404);
        });
    });
  });

  describe('put', () => {
    const createCustomerPayload = {email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'};
    const updateCustomerPayload = {email: `${cuid()}@bigwednesday.io`, vatNumber: 'HY7UJL'};
    let createResponse;
    let updateResponse;

    before(() => {
      return specRequest({url: '/customers', method: 'POST', payload: createCustomerPayload})
        .then(response => {
          expect(response.statusCode).to.equal(201);
          createResponse = response;
          return specRequest({
            url: createResponse.headers.location,
            method: 'PUT',
            payload: updateCustomerPayload
          });
        })
        .then(response => {
          if (response.statusCode !== 200) {
            return console.error(response.result);
          }
          updateResponse = response;
        });
    });

    it('returns http 200 when customer is updated', () => {
      expect(updateResponse.statusCode).to.equal(200);
    });

    it('returns the updated customer resource', () => {
      const expected = Object.assign({
        id: createResponse.result.id,
        _metadata: createResponse.result._metadata
      }, updateCustomerPayload);

      expect(updateResponse.result).to.eql(expected);
    });

    it('returns 404 when customer does not exist', () => {
      return specRequest({
        url: '/customers/unknown',
        method: 'PUT',
        payload: updateCustomerPayload
      })
      .then(response => {
        expect(response.statusCode).to.equal(404);
      });
    });

    describe('validation', () => {
      it('rejects id', () => {
        return specRequest({
          url: createResponse.headers.location,
          method: 'PUT',
          payload: Object.assign({id: 'A'}, updateCustomerPayload)
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result.message).to.equal('"id" is not allowed');
        });
      });

      it('requires email address', () => {
        return specRequest({
          url: createResponse.headers.location,
          method: 'PUT',
          payload: _.omit(updateCustomerPayload, 'email')
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result.message).to.equal('child "email" fails because ["email" is required]');
        });
      });

      it('validates email address format', () => {
        return specRequest({
          url: createResponse.headers.location,
          method: 'PUT',
          payload: _.defaults({email: 'bigwednesday.io', updateCustomerPayload})
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result.message).to.equal('child "email" fails because ["email" must be a valid email]');
        });
      });

      it('rejects _metadata', () => {
        return specRequest({
          url: createResponse.headers.location,
          method: 'PUT',
          payload: Object.assign({_metadata: {created: new Date()}}, updateCustomerPayload)
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result.message).to.equal('"_metadata" is not allowed');
        });
      });
    });
  });
});
