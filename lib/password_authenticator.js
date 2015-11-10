'use strict';

const request = require('request-promise');

class AuthenticationFailedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationFailedError';
  }
}

const authenticatePassword = (username, password) => {
  return request({
    method: 'POST',
    uri: `https://${process.env.AUTH0_DOMAIN}/oauth/ro`,
    body: {
      client_id: process.env.AUTHO_CLIENT_ID,
      username,
      password,
      connection: process.env.AUTH0_CONNECTION,
      grant_type: 'password',
      scope: 'openid scope'
    },
    json: true
  })
  .then(auth => auth.id_token, err => {
    if (err.error.error === 'invalid_user_password') {
      throw new AuthenticationFailedError();
    }
    throw err;
  });
};

module.exports = authenticatePassword;
