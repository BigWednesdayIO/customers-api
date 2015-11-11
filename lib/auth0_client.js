'use strict';

const Auth0 = require('auth0');

const requiredEnvVars = ['AUTH0_DOMAIN', 'AUTHO_CLIENT_ID', 'AUTH0_CLIENT_SECRET', 'AUTH0_CONNECTION'];

requiredEnvVars.forEach(name => {
  if (!process.env[name]) {
    throw new Error(`Requried environment variable ${name} not set`);
  }
});

module.exports = new Auth0({
  domain: process.env.AUTH0_DOMAIN,
  clientID: process.env.AUTHO_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET
});
