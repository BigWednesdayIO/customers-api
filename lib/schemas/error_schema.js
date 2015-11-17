'use strict';

const Joi = require('joi');

module.exports = Joi.object({
  message: Joi.string().description('A message explaining the error'),
  error: Joi.string().description('An error message'),
  statusCode: Joi.number().integer().description('An HTTP status code')
}).meta({className: 'Error'});
