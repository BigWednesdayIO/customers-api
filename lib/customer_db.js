'use strict';

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
      auth0Client.createUser({
        connection: process.env.AUTH0_CONNECTION,
        email: params.email,
        password: params.password
      }, (err, customer) => {
        if (err) {
          if (err.code === 'user_exists') {
            return reject(new UserExistsError());
          }
          return reject(err);
        }

        resolve({
          id: customer.user_id,
          email: customer.email
        });
      });
    });
  }
};

module.exports = customerDb;
