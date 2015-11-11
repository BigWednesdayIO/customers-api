'use strict';

const request = require('request-promise');
const jsonwebtoken = require('jsonwebtoken');

class AuthenticationFailedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationFailedError';
  }
}

const authenticatePassword = (email, password) => {
  return request({
    method: 'POST',
    uri: `https://${process.env.AUTH0_DOMAIN}/oauth/ro`,
    body: {
      client_id: process.env.AUTHO_CLIENT_ID,
      username: email,
      password,
      connection: process.env.AUTH0_CONNECTION,
      grant_type: 'password',
      scope: 'openid scope'
    },
    json: true
  })
  .then(auth => {
    return {
      id: jsonwebtoken.decode(auth.id_token).sub,
      email,
      token: auth.id_token
    };
  }, err => {
    if (err.error.error === 'invalid_user_password') {
      throw new AuthenticationFailedError();
    }
    throw err;
  });
};

module.exports = authenticatePassword;
