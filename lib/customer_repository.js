'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const auth0Client = require('./auth0_client');
const dataset = require('./dataset');

class CustomerNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CustomerNotFoundError';
  }
}

const buildCustomerModel = (id, attributes) => {
  const model = {id, _metadata: {created: attributes._metadata_created}};
  return Object.assign(model, _.omit(attributes, (value, property) => {
    return property === '_hidden' || property.startsWith('_metadata');
  }));
};

const customerKeyFor = id => dataset.key(['Customer', id]);

const getCustomerEntity = id => {
  return new Promise((resolve, reject) => {
    dataset.get(customerKeyFor(id), (err, customer) => {
      if (err) {
        return reject(err);
      }
      if (!customer) {
        return reject(new CustomerNotFoundError());
      }

      resolve(customer.data);
    });
  });
};

const saveCustomerEntity = (id, entity, method) => {
  return new Promise((resolve, reject) => {
    dataset.save({key: customerKeyFor(id), method, data: entity}, err => {
      if (err) {
        return reject(err);
      }
      resolve(entity);
    });
  });
};

const createCustomerEntity = _.partialRight(saveCustomerEntity, 'insert');
const updateCustomerEntity = _.partialRight(saveCustomerEntity, 'update');

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
      scope: [`user:${customerId}`]
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
        reject(err);
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
        const customerEntity = Object.assign({
          _hidden: {auth0Id},
          _metadata_created: new Date()
        }, _.omit(customerParams, ['password']));

        return createCustomerEntity(id, customerEntity)
          .then(createdEntity => {
            return buildCustomerModel(id, createdEntity);
          }, err => {
            const fail = () => {
              throw err;
            };
            return deleteAuth0User(auth0Id).then(fail, fail);
          });
      });
  },

  get(id) {
    return getCustomerEntity(id).then(customerEntity => buildCustomerModel(id, customerEntity));
  },

  update(id, customerParams) {
    return getCustomerEntity(id)
      .then(customerEntity => {
        if (customerParams.email !== customerEntity.email) {
          return updateAuth0Email(customerEntity._hidden.auth0Id, customerParams.email)
            .then(() => customerEntity);
        }
        return customerEntity;
      })
      .then(retrievedCustomerEntity => {
        const customerEntity = Object.assign({
          _hidden: retrievedCustomerEntity._hidden,
          _metadata_created: retrievedCustomerEntity._metadata_created
        }, customerParams);

        return updateCustomerEntity(id, customerEntity)
          .then(updatedEntity => buildCustomerModel(id, updatedEntity));
      });
  }
};

module.exports = customerRepository;
