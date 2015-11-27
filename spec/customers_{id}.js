'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const expect = require('chai').expect;
const specRequest = require('./spec_request');
const signToken = require('./sign_jwt');

const adminToken = signToken({scope: ['admin']});

describe('/customers/{id}', () => {
  const createCustomerPayload = {
    email: `test-${cuid()}@bigwednesday.io`,
    password: '8u{F0*W1l5',
    vat_number: '12345',
    line_of_business: 'Eating & Drinking Out'
  };

  let createResponse;
  let validToken;

  before(() => {
    return specRequest({
      url: '/customers',
      method: 'POST',
      payload: createCustomerPayload
    })
    .then(response => {
      createResponse = response;
      expect(response.statusCode).to.equal(201);
      validToken = signToken({scope: [`customer:${createResponse.result.id}`]});
    });
  });

  describe('get', () => {
    let getResponse;

    before(() => {
      return specRequest({url: `${createResponse.headers.location}?token=${validToken}`, method: 'GET'})
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

    it('returns 403 when requesting customer without correct scope', () => {
      const otherUsersToken = signToken({scope: ['customer:12345']});
      return specRequest({url: `${createResponse.headers.location}?token=${otherUsersToken}`, method: 'GET'})
        .then(response => {
          expect(response.statusCode).to.equal(403);
          expect(response.result.message).match(/Insufficient scope/);
        });
    });

    describe('admin', () => {
      it('gets any customer', () => {
        return specRequest({url: `${createResponse.headers.location}?token=${adminToken}`, method: 'GET'})
          .then(response => {
            expect(response.statusCode).to.equal(200);
          });
      });

      it('returns 404 when customer does not exist', () => {
        return specRequest({url: `/customers/unknown_customer?token=${adminToken}`, method: 'GET'})
          .then(response => {
            expect(response.statusCode).to.equal(404);
            expect(response.result).to.have.property('message', 'Customer "unknown_customer" not found.');
          });
      });
    });
  });

  describe('put', () => {
    const updateCustomerPayload = {
      email: `test-${cuid()}@bigwednesday.io`,
      vat_number: 'HY7UJL'
    };

    let updateResponse;

    before(() => {
      return specRequest({
        url: `${createResponse.headers.location}?token=${validToken}`,
        method: 'PUT',
        payload: updateCustomerPayload
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

    it('persists updates', () => {
      return specRequest({url: `${createResponse.headers.location}?token=${validToken}`, method: 'GET'})
        .then(getResponse => {
          expect(updateResponse.result).to.eql(getResponse.result);
        });
    });

    it('returns 403 when updating customer without correct scope', () => {
      const otherUsersToken = signToken({scope: ['customer:12345']});
      return specRequest({
        url: `${createResponse.headers.location}?token=${otherUsersToken}`,
        method: 'PUT',
        payload: updateCustomerPayload
      })
      .then(response => {
        expect(response.statusCode).to.equal(403);
        expect(response.result.message).match(/Insufficient scope/);
      });
    });

    describe('admin', () => {
      it('updates any customer', () => {
        return specRequest({
          url: `${createResponse.headers.location}?token=${adminToken}`,
          method: 'PUT',
          payload: updateCustomerPayload
        })
        .then(response => {
          expect(response.statusCode).to.equal(200);
        });
      });

      it('returns 404 when customer does not exist', () => {
        return specRequest({
          url: `/customers/unknown_customer?token=${adminToken}`,
          method: 'PUT',
          payload: updateCustomerPayload
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
          url: `${createResponse.headers.location}?token=${validToken}`,
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
          url: `${createResponse.headers.location}?token=${validToken}`,
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
          url: `${createResponse.headers.location}?token=${validToken}`,
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
          url: `${createResponse.headers.location}?token=${validToken}`,
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
