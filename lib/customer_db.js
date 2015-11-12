'use strict';

const cuid = require('cuid');
const auth0Client = require('./auth0_client');

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
  create(params) {
    return new Promise((resolve, reject) => {
      const bwId = cuid();

      auth0Client.createUser({
        connection: process.env.AUTH0_CONNECTION,
        email: params.email,
        password: params.password,
        bigwednesday_id: bwId
      }, (err, customer) => {
        if (err) {
          return auth0ErrorMap[err.code] ? reject(new auth0ErrorMap[err.code]()) : reject(err);
        }

        resolve({
          id: customer.bigwednesday_id,
          email: customer.email
        });
      });
    });
  }
};

module.exports = customerDb;
