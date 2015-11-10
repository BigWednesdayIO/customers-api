'use strict';

const nock = require('nock');
const expect = require('chai').expect;

const authenticatePassword = require('../lib/password_authenticator');

describe('Password authenticator', () => {
  describe('valid', () => {
    let httpInterceptor;
    let authenticatePasswordResult;

    const mockAuthResponse = {
      id_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2JpZ3dlZG5lc2RheS1pby5ldS5hdXRoMC5jb20vIiwic3ViIjoiYXV0aDB8NTY0MjBlMDZjMjNkMWFkMzM5MDU0MTc0IiwiYXVkIjoiSncxYUNaSTN4WnJYem91dzdITWtCNXdFY3pJenpkU08iLCJleHAiOjE0NDcyMDY3MjYsImlhdCI6MTQ0NzE3MDcyNn0.yIA7uTGtMZ7lxU0Y762TM3XZym96uZDANDBkU24eQFY',
      access_token: 'lqzX26w1yjm6nRP5',
      token_type: 'bearer'
    };

    before(() => {
      httpInterceptor = nock(`https://${process.env.AUTH0_DOMAIN}`)
                .post('/oauth/ro', {
                  client_id: process.env.AUTHO_CLIENT_ID,
                  username: 'test@bigwednesday.io',
                  password: 'password',
                  connection: process.env.AUTH0_CONNECTION,
                  grant_type: 'password',
                  scope: 'openid scope'
                })
                .reply(200, mockAuthResponse);

      return authenticatePassword('test@bigwednesday.io', 'password')
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
      expect(authenticatePasswordResult).to.equal(mockAuthResponse.id_token);
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
