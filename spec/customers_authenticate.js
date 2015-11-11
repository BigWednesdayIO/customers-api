'use strict';

const expect = require('chai').expect;
const cuid = require('cuid');
const jsonwebtoken = require('jsonwebtoken');
const specRequest = require('./spec_request');
const auth0Client = require('../lib/auth0_client');

describe('/customers/authenticate', () => {
  describe('post', () => {
    const testEmail = `${cuid()}@bigwednesday.io`;
    const testPassword = '123456';
    let testCustomerId;
    let authResponse;

    before(() => {
      return specRequest({
        url: '/customers',
        method: 'POST',
        payload: {
          email: testEmail,
          password: testPassword
        }
      })
      .then(response => {
        if (response.statusCode !== 201) {
          return console.error(response.result);
        }

        testCustomerId = response.result.id;
      })
      .then(() => {
        return specRequest({
          url: '/customers/authenticate',
          method: 'POST',
          payload: {
            email: testEmail,
            password: testPassword
          }
        })
        .then(response => {
          authResponse = response;
        });
      });
    });

    after(done => {
      const auth0UserId = jsonwebtoken.decode(authResponse.result.token).sub;
      auth0Client.deleteUser(auth0UserId, done);
    });

    it('returns http 200', () => {
      expect(authResponse.statusCode).to.equal(200);
    });

    it('returns email address', () => {
      expect(authResponse.result.email).to.equal(testEmail);
    });

    it('returns id', () => {
      expect(authResponse.result.id).to.equal(testCustomerId);
    });

    it('returns token', () => {
      const token = jsonwebtoken.verify(
        authResponse.result.token,
        new Buffer(process.env.AUTH0_CLIENT_SECRET, 'base64'),
        {
          algorithms: ['HS256'],
          audience: process.env.AUTHO_CLIENT_ID,
          issuer: `https://${process.env.AUTH0_DOMAIN}/`
        });

      expect(token.bigwednesday_id).to.equal(authResponse.result.id);
    });

    it('returns http 400 when user does not exist', () => {
      return specRequest({
        url: '/customers/authenticate',
        method: 'POST',
        payload: {email: `${cuid()}@bigwednesday.io`, password: '123456'}
      })
      .then(response => {
        expect(response.statusCode).to.equal(400);
        expect(response.result.message).to.equal('Invalid email address or password.');
      });
    });

    it('returns http 400 when incorrect password', () => {
      return specRequest({
        url: '/customers/authenticate',
        method: 'POST',
        payload: {email: testEmail, password: 'not-a-valid-password'}
      })
      .then(response => {
        expect(response.statusCode).to.equal(400);
        expect(response.result.message).to.equal('Invalid email address or password.');
      });
    });

    describe('validation', () => {
      it('requires email address', () => {
        return specRequest({
          url: '/customers/authenticate',
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
          url: '/customers/authenticate',
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
          url: '/customers/authenticate',
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
