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

const customerDb = {
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

        dataset.save({
          key: dataset.key(['Customer', id]),
          method: 'insert',
          data: _.omit(customerParams, 'password')
        }, err => {
          if (err) {
            // TODO what to do? We already created it in auth0!
            console.error(err);
            return reject(err);
          }

          resolve({
            id: createdCustomer.bigwednesday_id,
            email: createdCustomer.email
          });
        });
      });
    });
  }
};

module.exports = customerDb;
