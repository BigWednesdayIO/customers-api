'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const expect = require('chai').expect;
const specRequest = require('./spec_request');
const signToken = require('./sign_jwt');

const adminToken = signToken({scope: ['admin']});

describe('/customers/{id}', () => {
  const createParams = () => ({
    email: `test-${cuid()}@bigwednesday.io`,
    password: '8u{F0*W1l5',
    vat_number: '12345',
    line_of_business: 'Eating & Drinking Out',
    default_sign_for: true
  });

  describe('get', () => {
    let createResponse;
    let validToken;
    let getResponse;

    before(() => {
      return specRequest({
        url: '/customers',
        method: 'POST',
        payload: createParams()
      })
      .then(response => {
        createResponse = response;
        validToken = signToken({scope: [`customer:${createResponse.result.id}`]});

        return specRequest({
          url: createResponse.headers.location,
          method: 'GET',
          headers: {authorization: validToken}
        });
      })
      .then(response => {
        getResponse = response;
      });
    });

    it('returns http 200 when customer is found', () => {
      expect(getResponse.statusCode).to.equal(200);
    });

    it('returns the customer resource', () => {
      expect(getResponse.result).to.eql(createResponse.result);
    });

    it('returns 403 when requesting customer without correct scope', () => {
      const otherUsersToken = signToken({scope: ['customer:12345']});
      return specRequest({
        url: createResponse.headers.location,
        method: 'GET',
        headers: {authorization: otherUsersToken}
      })
      .then(response => {
        expect(response.statusCode).to.equal(403);
        expect(response.result.message).match(/Insufficient scope/);
      });
    });

    describe('admin', () => {
      it('gets any customer', () => {
        return specRequest({
          url: createResponse.headers.location,
          method: 'GET',
          headers: {authorization: adminToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(200);
        });
      });

      it('returns 404 when customer does not exist', () => {
        return specRequest({
          url: '/customers/unknown_customer',
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
    let createResponse;
    let validToken;
    let updateResponse;

    const updateCustomerPayload = {
      email: `test-${cuid()}@bigwednesday.io`,
      vat_number: 'HY7UJL'
    };

    before(() => {
      return specRequest({
        url: '/customers',
        method: 'POST',
        payload: createParams()
      })
      .then(response => {
        createResponse = response;
        validToken = signToken({scope: [`customer:${createResponse.result.id}`]});

        return specRequest({
          url: createResponse.headers.location,
          method: 'PUT',
          payload: updateCustomerPayload,
          headers: {authorization: validToken}
        });
      })
      .then(response => {
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

    it('persists updates', () => {
      return specRequest({
        url: createResponse.headers.location,
        method: 'GET',
        headers: {authorization: validToken}
      })
      .then(getResponse => {
        expect(updateResponse.result).to.eql(getResponse.result);
      });
    });

    it('returns 403 when updating customer without correct scope', () => {
      const otherUsersToken = signToken({scope: ['customer:12345']});
      return specRequest({
        url: createResponse.headers.location,
        method: 'PUT',
        payload: updateCustomerPayload,
        headers: {authorization: otherUsersToken}
      })
      .then(response => {
        expect(response.statusCode).to.equal(403);
        expect(response.result.message).match(/Insufficient scope/);
      });
    });

    describe('admin', () => {
      it('updates any customer', () => {
        return specRequest({
          url: createResponse.headers.location,
          method: 'PUT',
          payload: updateCustomerPayload,
          headers: {authorization: adminToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(200);
        });
      });

      it('returns 404 when customer does not exist', () => {
        return specRequest({
          url: '/customers/unknown_customer',
          method: 'PUT',
          payload: updateCustomerPayload,
          headers: {authorization: adminToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Customer "unknown_customer" not found.');
        });
      });
    });

    describe('validation', () => {
      it('rejects id', () => {
        return specRequest({
          url: createResponse.headers.location,
          method: 'PUT',
          payload: Object.assign({id: 'A'}, updateCustomerPayload),
          headers: {authorization: validToken}
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
          payload: _.omit(updateCustomerPayload, 'email'),
          headers: {authorization: validToken}
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
          payload: _.defaults({email: 'bigwednesday.io', updateCustomerPayload}),
          headers: {authorization: validToken}
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
          payload: Object.assign({_metadata: {created: new Date()}}, updateCustomerPayload),
          headers: {authorization: validToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result.message).to.equal('"_metadata" is not allowed');
        });
      });

      it('requires default_sign_for to be boolean', () => {
        return specRequest({
          url: createResponse.headers.location,
          method: 'PUT',
          payload: Object.assign({default_sign_for: 'a string'}, updateCustomerPayload),
          headers: {authorization: validToken}
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result.message).to.equal('child "default_sign_for" fails because ["default_sign_for" must be a boolean]');
        });
      });

      describe('addresses', () => {
        const addressObject = {
          name: 'foo',
          company: 'bar',
          line_1: 'here',
          city: 'there',
          postcode: 'baz'
        };

        it('allows one', () => {
          return specRequest({
            url: createResponse.headers.location,
            method: 'PUT',
            payload: Object.assign({addresses: [addressObject]}, updateCustomerPayload),
            headers: {authorization: validToken}
          })
          .then(response => {
            expect(response.statusCode).to.equal(200);
          });
        });

        it('allows multiple', () => {
          return specRequest({
            url: createResponse.headers.location,
            method: 'PUT',
            payload: Object.assign({addresses: [addressObject, addressObject]}, updateCustomerPayload),
            headers: {authorization: validToken}
          })
          .then(response => {
            expect(response.statusCode).to.equal(200);
          });
        });

        it('requires a complete address', () => {
          return specRequest({
            url: createResponse.headers.location,
            method: 'PUT',
            payload: Object.assign({addresses: [{name: 'foo', postcode: 'bar'}]}, updateCustomerPayload),
            headers: {authorization: validToken}
          })
          .then(response => {
            expect(response.statusCode).to.equal(400);
          });
        });
      });
    });
  });
});
