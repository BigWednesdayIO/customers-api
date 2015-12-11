'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const cuid = require('cuid');
const jsonwebtoken = require('jsonwebtoken');
const specRequest = require('./spec_request');

describe('/customers/authenticate', () => {
  describe('post', () => {
    const testEmail = `test-${cuid()}@bigwednesday.io`;
    const testPassword = '8u{F0*W1l5';
    let testCustomerId;
    let authResponse;

    before(function () {
      this.timeout(5000);

      return specRequest({
        url: '/customers',
        method: 'POST',
        payload: {
          email: testEmail,
          password: testPassword
        }
      })
      .then(response => {
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
        });
      })
      .then(response => {
        authResponse = response;
      });
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

      expect(token.customer_id).to.equal(authResponse.result.id);
      expect(_.includes(token.scope, `customer:${testCustomerId}`)).to.be.ok;
    });

    it('returns http 400 when user does not exist', () => {
      return specRequest({
        url: '/customers/authenticate',
        method: 'POST',
        payload: {email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'}
      })
      .then(response => {
        expect(response.statusCode).to.equal(401);
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
        expect(response.statusCode).to.equal(401);
        expect(response.result.message).to.equal('Invalid email address or password.');
      });
    });

    describe('validation', () => {
      it('requires email address', () => {
        return specRequest({
          url: '/customers/authenticate',
          method: 'POST',
          payload: {password: '8u{F0*W1l5'}
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
          payload: {email: 'bigwednesday.io', password: '8u{F0*W1l5'}
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
