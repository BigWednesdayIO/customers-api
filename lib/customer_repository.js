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
      }, (err, createdCustomer) => {
        if (err) {
          return auth0ErrorMap[err.code] ? reject(new auth0ErrorMap[err.code]()) : reject(err);
        }

        const customerAttributes = Object.assign({
          _hidden: {auth0Id: createdCustomer.user_id},
          _metadata_created: new Date()
        }, _.omit(customerParams, ['password']));

        dataset.save({
          key: customerKeyFor(id),
          method: 'insert',
          data: customerAttributes
        }, err => {
          if (err) {
            auth0Client.deleteUser(createdCustomer.user_id, deleteErr => {
              if (deleteErr) {
                console.error('Unable to delete user', deleteErr);
              }
              reject(err);
            });
            return;
          }

          resolve(buildCustomerModel(id, customerAttributes));
        });
      });
    });
  },

  get(id) {
    return getRawCustomer(id).then(customerData => buildCustomerModel(id, customerData));
  },

  update(id, customerParams) {
    return getRawCustomer(id)
      .then(customerData => {
        if (customerParams.email !== customerData.email) {
          return new Promise((resolve, reject) => {
            const verifyEmail = true;
            auth0Client.updateUserEmail(customerData._hidden.auth0Id, customerParams.email, verifyEmail, err => {
              if (err) {
                return reject(err);
              }

              resolve(customerData);
            });
          });
        }
        return customerData;
      })
      .then(customerData => {
        const customerAttributes = Object.assign({
          _hidden: customerData._hidden,
          _metadata_created: customerData._metadata_created
        }, customerParams);

        return new Promise((resolve, reject) => {
          dataset.save({
            key: customerKeyFor(id),
            method: 'update',
            data: customerAttributes
          }, err => {
            if (err) {
              return reject(err);
            }

            resolve(buildCustomerModel(id, customerAttributes));
          });
        });
      });
  }
};

module.exports = customerRepository;
