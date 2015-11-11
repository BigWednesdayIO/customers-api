'use strict';

const joi = require('joi');

const credentialsSchema = joi.object({
  email: joi.string().required().email().description('Customer email address'),
  password: joi.string().required().description('Customer password')
}).meta({
  className: 'CustomerCredentials'
});

module.exports = credentialsSchema;
