'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');

const auth0Client = require('../lib/auth0_client');
const customerDb = require('../lib/customer_db');

describe('Customer DB', () => {
  describe('create', () => {
    let createUserStub;

    beforeEach(() => {
      createUserStub = sinon.stub(auth0Client, 'createUser', (params, callback) => {
        if (params.email === 'existing@bigwednesday.io') {
          const auth0UserExistsError = new Error();
          auth0UserExistsError.code = 'user_exists';
          return callback(auth0UserExistsError);
        }
        if (params.password === 'weak') {
          const auth0InvalidPasswordError = new Error();
          auth0InvalidPasswordError.code = 'invalid_password';
          return callback(auth0InvalidPasswordError);
        }
        callback(null, {email: params.email, bigwednesday_id: params.bigwednesday_id});
      });
    });

    afterEach(() => {
      createUserStub.restore();
    });

    it('creates user in auth0', () => {
      const createParams = {email: 'test@bigwednesday.io', password: '12345'};
      return customerDb.create(createParams)
        .then(() => {
          sinon.assert.calledOnce(createUserStub);
          sinon.assert.calledWith(createUserStub, sinon.match(createParams));
        });
    });

    it('returns id', () => {
      return customerDb.create({email: 'test@bigwednesday.io', password: '12345'})
        .then(customer => {
          expect(customer.id).to.match(/^c.*/);
          expect(customer.id).to.have.length(25);
        });
    });

    it('returns email', () => {
      return customerDb.create({email: 'test@bigwednesday.io', password: '12345'})
        .then(customer => {
          expect(customer.email).to.equal('test@bigwednesday.io');
        });
    });

    it('errors when customer exists', () => {
      return customerDb.create({email: 'existing@bigwednesday.io', password: '12345'})
        .then(() => {
          throw new Error('Create customer should fail for existing user');
        }, err => {
          expect(err.name).to.equal('UserExistsError');
          expect(err instanceof Error).to.equal(true);
        });
    });

    it('errors for password to weak', () => {
      return customerDb.create({email: 'test@bigwednesday.io', password: 'weak'})
        .then(() => {
          throw new Error('Create customer should fail');
        }, err => {
          expect(err.name).to.equal('InvalidPasswordError');
          expect(err instanceof Error).to.equal(true);
        });
    });
  });
});
