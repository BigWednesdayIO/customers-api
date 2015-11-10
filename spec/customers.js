'use strict';

const expect = require('chai').expect;
const specRequest = require('./spec_request');

describe('/customers', () => {
  describe('post', () => {
    describe('created customer', () => {
      let createUserResponse;

      beforeEach(() => {
        createUserResponse = undefined;
        return specRequest({
          url: '/customers',
          method: 'POST',
          payload: {
            email: 'test@bigwednesday.io',
            password: '123456'
          }
        })
        .then(response => {
          if (response.statusCode !== 201) {
            return console.error(response.result);
          }
          createUserResponse = response;
        });
      });

      it('returns http 201', () => {
        expect(createUserResponse.statusCode).to.equal(201);
      });

      it('provides created resource location', () => {
        expect(createUserResponse.headers.location).to.equal(`/customers/${createUserResponse.result.id}`);
      });

      it('has email address', () => {
        expect(createUserResponse.result.email).to.equal('test@bigwednesday.io');
      });

      it('has id', () => {
        expect(createUserResponse.result.id).to.equal(createUserResponse.result.id);
      });
    });

    describe('validation', () => {
      it('requires email address', () => {
        return specRequest({
          url: '/customers',
          method: 'POST',
          payload: {password: '12345'}
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result.message).to.equal('child "email" fails because ["email" is required]');
        });
      });

      it('validates email address format', () => {
        return specRequest({
          url: '/customers',
          method: 'POST',
          payload: {email: 'bigwednesday.io', password: '12345'}
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result.message).to.equal('child "email" fails because ["email" must be a valid email]');
        });
      });

      it('requires password', () => {
        return specRequest({
          url: '/customers',
          method: 'POST',
          payload: {email: 'test@bigwednesday.io'}
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result.message).to.equal('child "password" fails because ["password" is required]');
        });
      });
    });
  });
});
