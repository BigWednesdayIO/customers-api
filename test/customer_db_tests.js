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
        callback(null, {email: params.email, bigwednesday_id: params.bigwednesday_id});
      });
    });

    afterEach(() => {
      createUserStub.restore();
    });

    it('creates a user in auth0', () => {
      const createParams = {email: 'test@bigwednesday.io', password: '12345'};
      return customerDb.create(createParams)
        .then(() => {
          sinon.assert.calledOnce(createUserStub);
          sinon.assert.calledWith(createUserStub, sinon.match(createParams));
        });
    });

    it('has id', () => {
      return customerDb.create({email: 'test@bigwednesday.io', password: '12345'})
        .then(customer => {
          expect(customer.id).to.match(/^c.*/);
          expect(customer.id).to.have.length(25);
        });
    });

    it('throws when customer exists', () => {
      return customerDb.create({email: 'existing@bigwednesday.io', password: '12345'})
        .then(() => {
          throw new Error('Create customer should fail');
        }, err => {
          expect(err.name).to.equal('UserExistsError');
          expect(err instanceof Error).to.equal(true);
        });
    });
  });
});
