'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const auth0Client = require('./auth0_client');
const dataset = require('./dataset');

class UserExistsError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserExistsError';
  }
}

class InvalidPasswordError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidPasswordError';
  }
}

const auth0ErrorMap = {
  user_exists: UserExistsError,
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
  }
};

module.exports = customerRepository;
