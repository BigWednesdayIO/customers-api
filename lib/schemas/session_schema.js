'use strict';

const joi = require('joi');

const sessionSchema = joi.object({
  id: joi.string().required().description('Customer identifier'),
  email: joi.string().required().email().description('Customer email address'),
  token: joi.string().required().description('Authentication token')
}).meta({
  className: 'CustomerSession'
});

module.exports = sessionSchema;
