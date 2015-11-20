'use strict';

const jsonwebtoken = require('jsonwebtoken');

const signToken = (payload, options) => {
  return jsonwebtoken.sign(
    payload || {},
    new Buffer(process.env.AUTH0_CLIENT_SECRET, 'base64'),
    Object.assign({
      algorithm: 'HS256',
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      audience: process.env.AUTHO_CLIENT_ID
    }, options));
};

module.exports = signToken;
