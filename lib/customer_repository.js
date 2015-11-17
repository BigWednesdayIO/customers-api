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

const auth0ErrorMap = {
  user_exists: CustomerExistsError,
  invalid_password: InvalidPasswordError
};

const customerKeyFor = id => dataset.key(['Customer', id]);

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

        const customerAttributes = _.omit(customerParams, 'password');

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

          resolve(Object.assign({id}, customerAttributes));
        });
      });
    });
  },

  get(id) {
    return new Promise((resolve, reject) => {
      dataset.get(customerKeyFor(id), (err, customer) => {
        if (err) {
          return reject(err);
        }

        resolve(customer ? Object.assign({id}, customer.data) : undefined);
      });
    });
  },

  update(id, customerParams) {
    return this.get(id)
      .then(customer => {
        if (!customer) {
          throw new CustomerNotFoundError();
        }

        return new Promise((resolve, reject) => {
          dataset.save({key: customerKeyFor(id), method: 'update', data: customerParams}, err => {
            if (err) {
              return reject(err);
            }

            resolve(Object.assign({id}, customerParams));
          });
        });
      });
  }
};

module.exports = customerRepository;
