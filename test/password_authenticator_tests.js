'use strict';

const nock = require('nock');
const expect = require('chai').expect;
const jsonwebtoken = require('jsonwebtoken');

const authenticatePassword = require('../lib/password_authenticator');

describe('Password authenticator', () => {
  describe('valid', () => {
    const testEmail = 'test@bigwednesday.io';
    const testPassword = 'password';
    let httpInterceptor;
    let authenticatePasswordResult;

    const mockAuthResponse = {
      id_token: jsonwebtoken.sign({}, new Buffer(process.env.AUTH0_CLIENT_SECRET, 'base64'), {subject: '12345'})
    };

    before(() => {
      httpInterceptor = nock(`https://${process.env.AUTH0_DOMAIN}`)
                .post('/oauth/ro', {
                  client_id: process.env.AUTHO_CLIENT_ID,
                  username: testEmail,
                  password: testPassword,
                  connection: process.env.AUTH0_CONNECTION,
                  grant_type: 'password',
                  scope: 'openid scope'
                })
                .reply(200, mockAuthResponse);

      return authenticatePassword(testEmail, testPassword)
        .then(result => {
          authenticatePasswordResult = result;
        });
    });

    after(() => {
      nock.cleanAll();
    });

    it('authenticates with Auth0', () => {
      expect(httpInterceptor.isDone()).to.equal(true);
    });

    it('returns jwt', () => {
      expect(authenticatePasswordResult.token).to.equal(mockAuthResponse.id_token);
    });

    it('returns email', () => {
      expect(authenticatePasswordResult.email).to.equal(testEmail);
    });

    it('returns id', () => {
      expect(authenticatePasswordResult.id).to.equal('12345');
    });
  });

  describe('invalid', () => {
    before(() => {
      nock(`https://${process.env.AUTH0_DOMAIN}`)
        .post('/oauth/ro', {
          client_id: process.env.AUTHO_CLIENT_ID,
          username: 'test@bigwednesday.io',
          password: 'password',
          connection: process.env.AUTH0_CONNECTION,
          grant_type: 'password',
          scope: 'openid scope'
        })
        .reply(401, {
          error: 'invalid_user_password',
          error_description: 'Wrong email or password.'
        });
    });

    after(() => {
      nock.cleanAll();
    });

    it('authenticates with Auth0', () => {
      return authenticatePassword('test@bigwednesday.io', 'password')
        .then(() => {
          throw new Error('Error expected');
        }, err => {
          expect(err.name).to.equal('AuthenticationFailedError');
          expect(err instanceof Error).to.equal(true);
        });
    });
  });
});
