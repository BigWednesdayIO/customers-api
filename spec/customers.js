'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const cuid = require('cuid');
const jsonwebtoken = require('jsonwebtoken');
const specRequest = require('./spec_request');
const auth0Client = require('../lib/auth0_client');

describe('/customers', () => {
  describe('post', () => {
    const customerCredentials = {email: `${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'};
    let createUserResponse;

    before(function () {
      this.timeout(5000);

      createUserResponse = undefined;
      return specRequest({
        url: '/customers',
        method: 'POST',
        payload: customerCredentials
      })
      .then(response => {
        if (response.statusCode !== 201) {
          return console.error(response.result);
        }
        createUserResponse = response;
      });
    });

    after(done => {
      specRequest({
        url: '/customers/authenticate',
        method: 'POST',
        payload: customerCredentials
      })
      .then(authResponse => {
        const auth0UserId = jsonwebtoken.decode(authResponse.result.token).sub;
        auth0Client.deleteUser(auth0UserId, done);
      });
    });

    it('returns http 201', () => {
      expect(createUserResponse.statusCode).to.equal(201);
    });

    it('provides created resource location', () => {
      expect(createUserResponse.headers.location).to.equal(`/customers/${createUserResponse.result.id}`);
    });

    it('returns customer resource', () => {
      expect(_.omit(createUserResponse.result, 'id')).to.eql(_.omit(customerCredentials, 'password'));
      expect(createUserResponse.result.id).to.match(/^c.*/);
      expect(createUserResponse.result.id).to.have.length(25);
    });

    it('returns http 400 when customer already exists', () => {
      return specRequest({
        url: '/customers',
        method: 'POST',
        payload: customerCredentials
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
        payload: _.defaults({password: '1'}, customerCredentials)
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
