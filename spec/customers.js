'use strict';

const expect = require('chai').expect;
const cuid = require('cuid');
const specRequest = require('./spec_request');
const auth0Client = require('../lib/auth0_client');

describe('/customers', () => {
  describe('post', () => {
    describe('created customer', () => {
      const testEmail = `${cuid()}@bigwednesday.io`;
      let createUserResponse;

      before(() => {
        createUserResponse = undefined;
        return specRequest({
          url: '/customers',
          method: 'POST',
          payload: {
            email: testEmail,
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

      after(done => {
        auth0Client.deleteUser(createUserResponse.result.id, done);
      });

      it('returns http 201', () => {
        expect(createUserResponse.statusCode).to.equal(201);
      });

      it('provides created resource location', () => {
        expect(createUserResponse.headers.location).to.equal(`/customers/${createUserResponse.result.id}`);
      });

      it('has email address', () => {
        expect(createUserResponse.result.email).to.equal(testEmail);
      });

      it('has id', () => {
        expect(createUserResponse.result.id).to.equal(createUserResponse.result.id);
      });

      it('returns http 400 when user exists', () => {
        return specRequest({
          url: '/customers',
          method: 'POST',
          payload: {email: testEmail, password: '123456'}
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result.message).to.equal('Email address already in use or invalid password.');
        });
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
