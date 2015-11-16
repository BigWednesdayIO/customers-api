'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const sinon = require('sinon');

const auth0Client = require('../lib/auth0_client');
const customerDb = require('../lib/customer_repository');
const dataset = require('../lib/dataset');

describe('Customer repository', () => {
  let sandbox;
  let createUserStub;
  let deleteUserStub;
  let saveStub;
  let keySpy;

  before(() => {
    sandbox = sinon.sandbox.create();

    createUserStub = sandbox.stub(auth0Client, 'createUser', (params, callback) => {
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
      callback(null, {user_id: 'auth0|987654321', email: params.email, bigwednesday_id: params.bigwednesday_id});
    });

    deleteUserStub = sandbox.stub(auth0Client, 'deleteUser', (err, callback) => {
      callback();
    });

    keySpy = sandbox.spy(dataset, 'key');

    saveStub = sandbox.stub(dataset, 'save', (args, callback) => {
      if (args.data.email === 'fail_to_persist@bigwednesday.io') {
        return callback('Cannot save');
      }
      callback();
    });
  });

  after(() => {
    sandbox.restore();
  });

  describe('create', () => {
    const createCustomerParams = {email: 'test@bigwednesday.io', password: '12345'};
    let createdCustomer;

    before(() => {
      return customerDb.create(createCustomerParams)
        .then(result => {
          createdCustomer = result;
        });
    });

    it('creates user in auth0', () => {
      sinon.assert.calledOnce(createUserStub);
      sinon.assert.calledWith(createUserStub, sinon.match(createCustomerParams));
    });

    it('persists customer', () => {
      sinon.assert.calledOnce(saveStub);
      const expectedKey = keySpy.returnValues[0];
      sinon.assert.calledWith(saveStub, sinon.match({key: expectedKey, method: 'insert', data: _.omit(createCustomerParams, 'password')}));
    });

    it('does not persist customer password', () => {
      sinon.assert.calledWith(saveStub, sinon.match(value => {
        return !value.data.hasOwnProperty('password');
      }));
    });

    it('removes customer from auth0 if persistence fails', () => {
      return customerDb.create({email: 'fail_to_persist@bigwednesday.io', password: '12345'})
        .then(() => {
          throw new Error('Create customer should fail');
        }, () => {
          sinon.assert.calledOnce(deleteUserStub);
          sinon.assert.calledWith(deleteUserStub, sinon.match('auth0|987654321'));
        });
    });

    it('returns id', () => {
      expect(createdCustomer.id).to.match(/^c.*/);
      expect(createdCustomer.id).to.have.length(25);
    });

    it('returns email', () => {
      expect(createdCustomer.email).to.equal('test@bigwednesday.io');
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
