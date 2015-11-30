'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const auth0Client = require('../auth0_client');
const dataset = require('../dataset');
const entityStore = require('./entity_store');

const buildCustomerModel = attributes => _.omit(attributes, '_hidden');

const customerKey = id => dataset.key(['Customer', id]);

class CustomerExistsError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CustomerExistsError';
  }
}

class InvalidPasswordError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidPasswordError';
  }
}

const auth0ErrorMap = {
  user_exists: CustomerExistsError,
  invalid_password: InvalidPasswordError
};

const createAuth0User = (customerId, credentials) => {
  return new Promise((resolve, reject) => {
    auth0Client.createUser({
      connection: process.env.AUTH0_CONNECTION,
      email: credentials.email,
      password: credentials.password,
      bigwednesday_id: customerId,
      scope: [`customer:${customerId}`]
    }, (err, auth0User) => {
      if (err) {
        return auth0ErrorMap[err.code] ? reject(new auth0ErrorMap[err.code]()) : reject(err);
      }
      resolve(auth0User.user_id);
    });
  });
};

const deleteAuth0User = auth0Id => {
  return new Promise((resolve, reject) => {
    auth0Client.deleteUser(auth0Id, err => {
      if (err) {
        console.error('Unable to delete user', err);
        return reject(err);
      }
      resolve();
    });
  });
};

const updateAuth0Email = (auth0Id, newEmail) => {
  return new Promise((resolve, reject) => {
    const verifyEmail = true;
    auth0Client.updateUserEmail(auth0Id, newEmail, verifyEmail, err => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
};

const customerRepository = {
  create(customerParams) {
    const id = cuid();

    return createAuth0User(id, customerParams)
      .then(auth0Id => {
        const customerEntity = {_hidden: {auth0Id}};
        Object.assign(customerEntity, _.omit(customerParams, ['password']));

        return entityStore.create(customerKey(id), customerEntity)
          .then(createdEntity => {
            return buildCustomerModel(createdEntity);
          }, err => {
            const fail = () => {
              throw err;
            };
            return deleteAuth0User(auth0Id).then(fail, fail);
          });
      });
  },

  get(id) {
    return entityStore.get(customerKey(id)).then(customerEntity => buildCustomerModel(customerEntity));
  },

  update(id, customerParams) {
    return entityStore.get(customerKey(id))
      .then(customerEntity => {
        if (customerParams.email !== customerEntity.email) {
          return updateAuth0Email(customerEntity._hidden.auth0Id, customerParams.email)
            .then(() => customerEntity);
        }
        return customerEntity;
      })
      .then(retrievedCustomerEntity => {
        const customerEntity = _(retrievedCustomerEntity)
          .pick(['_hidden', '_metadata'])
          .assign(customerParams)
          .value();

        return entityStore.update(customerKey(id), customerEntity)
          .then(updatedEntity => buildCustomerModel(updatedEntity));
      });
  }
};

module.exports = customerRepository;
