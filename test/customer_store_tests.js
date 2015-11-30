'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const sinon = require('sinon');

const auth0Client = require('../lib/auth0_client');
const customers = require('../lib/stores/customer_store');
const dataset = require('../lib/dataset');

describe('Customer repository', () => {
  const fakeCreatedTimestamp = 1448450346461;
  let sandbox;
  let saveStub;

  const existingCustomer = {
    id: 'customer-a',
    email: 'existing@bigwednesday.io',
    line_of_business: 'Eating & Drinking Out',
    _metadata: {created: new Date()}
  };
  const fakeAuth0Id = 'auth0|12345';

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    sandbox.useFakeTimers(fakeCreatedTimestamp);

    saveStub = sandbox.stub(dataset, 'save', (args, callback) => {
      if (args.data.email === 'fail_to_persist@bigwednesday.io') {
        return callback('Cannot save');
      }
      callback();
    });

    sandbox.stub(dataset, 'get', (args, callback) => {
      if (_.last(args.path) === existingCustomer.id) {
        return callback(null, {
          key: {path: ['Customer', existingCustomer.id]},
          data: Object.assign({
            _hidden: {auth0Id: fakeAuth0Id},
            _metadata_created: existingCustomer._metadata.created
          }, _.omit(existingCustomer, ['id', '_metadata']))
        });
      }

      callback();
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('create', () => {
    let createUserStub;
    let deleteUserStub;
    let keySpy;
    let createdCustomer;

    const createCustomerParams = {email: 'test@bigwednesday.io', password: '12345'};

    beforeEach(() => {
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

        callback(null, {
          user_id: 'auth0|987654321',
          email: params.email,
          bigwednesday_id: params.bigwednesday_id,
          scope: params.scope
        });
      });

      deleteUserStub = sandbox.stub(auth0Client, 'deleteUser', (id, callback) => {
        callback();
      });

      keySpy = sandbox.spy(dataset, 'key');

      return customers.create(createCustomerParams)
        .then(result => {
          createdCustomer = result;
        });
    });

    it('creates user in auth0', () => {
      sinon.assert.calledOnce(createUserStub);
      sinon.assert.calledWith(
        createUserStub,
        sinon.match(Object.assign({
          bigwednesday_id: createdCustomer.id,
          scope: [`customer:${createdCustomer.id}`]
        }, createCustomerParams))
      );
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
      return customers.create({email: 'fail_to_persist@bigwednesday.io', password: '12345'})
        .then(() => {
          throw new Error('Create customer should fail');
        }, () => {
          sinon.assert.calledOnce(deleteUserStub);
          sinon.assert.calledWith(deleteUserStub, sinon.match('auth0|987654321'));
        });
    });

    it('returns customer attributes', () => {
      const attributeParams = _.omit(createCustomerParams, 'password');
      const createdAttributes = _.omit(createdCustomer, ['id', '_metadata']);
      expect(createdAttributes).to.eql(attributeParams);
    });

    it('returns id', () => {
      expect(createdCustomer.id).to.match(/^c.*/);
      expect(createdCustomer.id).to.have.length(25);
    });

    it('does not return password', () => {
      expect(createdCustomer.password).not.to.be.ok;
    });

    it('returns created date', () => {
      expect(createdCustomer._metadata).to.be.ok;
      expect(createdCustomer._metadata.created).to.eql(new Date(fakeCreatedTimestamp));
    });

    it('errors when customer exists', () => {
      return customers.create({email: 'existing@bigwednesday.io', password: '12345'})
        .then(() => {
          throw new Error('Create customer should fail for existing user');
        }, err => {
          expect(err.name).to.equal('CustomerExistsError');
          expect(err instanceof Error).to.equal(true);
        });
    });

    it('errors for password to weak', () => {
      return customers.create({email: 'test@bigwednesday.io', password: 'weak'})
        .then(() => {
          throw new Error('Create customer should fail');
        }, err => {
          expect(err.name).to.equal('InvalidPasswordError');
          expect(err instanceof Error).to.equal(true);
        });
    });
  });

  describe('get', () => {
    it('returns customer by id', () => {
      return customers
        .get(existingCustomer.id)
        .then(customer => {
          expect(customer).to.eql(existingCustomer);
        });
    });

    it('errors on non-existent customer', () => {
      return customers
        .get('unknown')
        .then(() => {
          throw new Error('Error expected');
        }, err => {
          expect(err.name).to.equal('EntityNotFoundError');
          expect(err instanceof Error).to.equal(true);
        });
    });
  });

  describe('update', () => {
    let updateUserEmailStub;
    let updatedCustomer;

    const updateParameters = {
      email: 'updated@bigwednesday.io',
      vat_number: 'UHYGFL'
    };

    beforeEach(() => {
      updateUserEmailStub = sandbox.stub(auth0Client, 'updateUserEmail', (id, email, verify, callback) => {
        callback();
      });

      return customers
        .update(existingCustomer.id, updateParameters)
        .then(customer => {
          updatedCustomer = customer;
        });
    });

    it('persists updated attributes', () => {
      sinon.assert.calledOnce(saveStub);
      sinon.assert.calledWith(saveStub, sinon.match({
        key: dataset.key(['Customer', existingCustomer.id]),
        method: 'update',
        data: updateParameters
      }));
    });

    it('does not keep obsolete properties', () => {
      sinon.assert.calledWithMatch(saveStub,
        sinon.match(value => !value.data.hasOwnProperty('line_of_business')));
    });

    it('returns updated resource', () => {
      expect(updatedCustomer).to.eql(Object.assign({
        id: existingCustomer.id,
        _metadata: existingCustomer._metadata
      }, updateParameters));
    });

    it('updates email address in auth0', () => {
      sinon.assert.calledOnce(updateUserEmailStub);
      sinon.assert.calledWith(updateUserEmailStub, fakeAuth0Id, updateParameters.email, true);
    });

    it('errors on non-existent customer', () => {
      return customers
        .update('unknown-customer', updateParameters)
        .then(() => {
          throw new Error('Error expected');
        }, err => {
          expect(err.name).to.equal('EntityNotFoundError');
          expect(err instanceof Error).to.equal(true);
        });
    });
  });
});
