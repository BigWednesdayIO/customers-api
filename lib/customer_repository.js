'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const auth0Client = require('./auth0_client');
const dataset = require('./dataset');

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

const auth0ErrorMap = {
  user_exists: CustomerExistsError,
  invalid_password: InvalidPasswordError
};

const customerKeyFor = id => dataset.key(['Customer', id]);

const getRawCustomer = id => {
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

const customerRepository = {
  create(customerParams) {
    return new Promise((resolve, reject) => {
      const id = cuid();

      auth0Client.createUser({
        connection: process.env.AUTH0_CONNECTION,
        email: customerParams.email,
        password: customerParams.password,
        bigwednesday_id: id
      }, (err, auth0User) => {
        if (err) {
          return auth0ErrorMap[err.code] ? reject(new auth0ErrorMap[err.code]()) : reject(err);
        }

        const customerEntity = Object.assign({
          _hidden: {auth0Id: auth0User.user_id},
          _metadata_created: new Date()
        }, _.omit(customerParams, ['password']));

        dataset.save({
          key: customerKeyFor(id),
          method: 'insert',
          data: customerEntity
        }, err => {
          if (err) {
            auth0Client.deleteUser(auth0User.user_id, deleteErr => {
              if (deleteErr) {
                console.error('Unable to delete user', deleteErr);
              }
              reject(err);
            });
          } else {
            resolve(buildCustomerModel(id, customerEntity));
          }
        });
      });
    });
  },

  get(id) {
    return getRawCustomer(id).then(customerEntity => buildCustomerModel(id, customerEntity));
  },

  update(id, customerParams) {
    return getRawCustomer(id)
      .then(customerEntity => {
        if (customerParams.email !== customerEntity.email) {
          return new Promise((resolve, reject) => {
            const verifyEmail = true;
            auth0Client.updateUserEmail(customerEntity._hidden.auth0Id, customerParams.email, verifyEmail, err => {
              if (err) {
                return reject(err);
              }

              resolve(customerEntity);
            });
          });
        }
        return customerEntity;
      })
      .then(retrievedCustomerEntity => {
        const updatedCustomerEntity = Object.assign({
          _hidden: retrievedCustomerEntity._hidden,
          _metadata_created: retrievedCustomerEntity._metadata_created
        }, customerParams);

        return new Promise((resolve, reject) => {
          dataset.save({
            key: customerKeyFor(id),
            method: 'update',
            data: updatedCustomerEntity
          }, err => {
            if (err) {
              return reject(err);
            }

            resolve(buildCustomerModel(id, updatedCustomerEntity));
          });
        });
      });
  }
};

module.exports = customerRepository;
