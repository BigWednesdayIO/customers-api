'use strict';

const cuid = require('cuid');
const auth0Client = require('./auth0_client');

class UserExistsError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserExistsError';
  }
}

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
          if (err.code === 'user_exists') {
            return reject(new UserExistsError());
          }
          return reject(err);
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
