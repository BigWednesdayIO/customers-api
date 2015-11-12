'use strict';

const expect = require('chai').expect;
const cuid = require('cuid');
const jsonwebtoken = require('jsonwebtoken');
const specRequest = require('./spec_request');
const auth0Client = require('../lib/auth0_client');

describe('/customers', () => {
  describe('post', () => {
    const testEmail = `${cuid()}@bigwednesday.io`;
    let createUserResponse;

    before(() => {
      createUserResponse = undefined;
      return specRequest({
        url: '/customers',
        method: 'POST',
        payload: {
          email: testEmail,
          password: '8u{F0*W1l5'
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
      const auth0UserId = jsonwebtoken.decode(createUserResponse.result.token).sub;
      auth0Client.deleteUser(auth0UserId, done);
    });

    it('returns http 201', () => {
      expect(createUserResponse.statusCode).to.equal(201);
    });

    it('provides created resource location', () => {
      expect(createUserResponse.headers.location).to.equal(`/customers/${createUserResponse.result.id}`);
    });

    it('returns email address', () => {
      expect(createUserResponse.result.email).to.equal(testEmail);
    });

    it('returns id', () => {
      expect(createUserResponse.result.id).to.match(/^c.*/);
      expect(createUserResponse.result.id).to.have.length(25);
    });

    it('returns token', () => {
      const token = jsonwebtoken.verify(
        createUserResponse.result.token,
        new Buffer(process.env.AUTH0_CLIENT_SECRET, 'base64'),
        {
          algorithms: ['HS256'],
          audience: process.env.AUTHO_CLIENT_ID,
          issuer: `https://${process.env.AUTH0_DOMAIN}/`
        });

      expect(token.bigwednesday_id).to.equal(createUserResponse.result.id);
    });

    it('returns http 400 when user exists', () => {
      return specRequest({
        url: '/customers',
        method: 'POST',
        payload: {email: testEmail, password: '8u{F0*W1l5'}
      })
      .then(response => {
        expect(response.statusCode).to.equal(400);
        expect(response.result.message).to.equal('Email address already in use or invalid password.');
      });
    });

    it('returns http 400 for weak password', () => {
      return specRequest({
        url: '/customers',
        method: 'POST',
        payload: {email: testEmail, password: '1'}
      })
      .then(response => {
        expect(response.statusCode).to.equal(400);
        expect(response.result.message).to.equal('Email address already in use or invalid password.');
      });
    });

    describe('validation', () => {
      it('requires email address', () => {
        return specRequest({
          url: '/customers',
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
          url: '/customers',
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
