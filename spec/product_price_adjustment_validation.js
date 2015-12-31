'use strict';

const _ = require('lodash');
const expect = require('chai').expect;

const parameters = require('./parameters/product_price_adjustment');
const signToken = require('./sign_jwt');
const specRequest = require('./spec_request');

describe('/customers/{id}/memberships/{id}/product_price_adjustments - payload validation', () => {
  ['post', 'put'].forEach(method => {
    describe(method, () => {
      const uri = `/customers/1/memberships/1/product_price_adjustments${method === 'put' ? '/1' : ''}`;

      ['linked_product_id', 'type', 'amount', 'start_date'].forEach(attribute => {
        it(`requires the ${attribute} attribute`, () =>
          specRequest({
            url: uri,
            method,
            headers: {authorization: signToken({scope: ['customer:1']})},
            payload: _.omit(parameters, attribute)
          })
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result).to.have.property('message', `child "${attribute}" fails because ["${attribute}" is required]`);
          }));
      });

      ['linked_product_id', 'type'].forEach(attribute => {
        it(`validates that the ${attribute} attribute is a string`, () =>
          specRequest({
            url: uri,
            method,
            headers: {authorization: signToken({scope: ['customer:1']})},
            payload: Object.assign({}, parameters, {[attribute]: 1})
          })
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result).to.have.property('message', `child "${attribute}" fails because ["${attribute}" must be a string]`);
          }));
      });

      ['start_date', 'end_date'].forEach(attribute => {
        it(`validates that the ${attribute} attribute is a date`, () =>
          specRequest({
            url: uri,
            method,
            headers: {authorization: signToken({scope: ['customer:1']})},
            payload: Object.assign({}, parameters, {[attribute]: 'abc'})
          })
          .then(response => {
            expect(response.statusCode).to.equal(400);
            expect(response.result).to.have.property('message', `child "${attribute}" fails because ["${attribute}" must be a number of milliseconds or valid date string]`);
          }));
      });

      it('validates that the amount attribute is a number', () =>
        specRequest({
          url: uri,
          method,
          headers: {authorization: signToken({scope: ['customer:1']})},
          payload: Object.assign({}, parameters, {amount: 'abc'})
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', `child "amount" fails because ["amount" must be a number]`);
        }));

      it('validates that the type attribute is one of [value_override, value_adjustment, percentage_adjustment]', () =>
        specRequest({
          url: uri,
          method,
          headers: {authorization: signToken({scope: ['customer:1']})},
          payload: Object.assign({}, parameters, {type: 'abc'})
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', `child "type" fails because ["type" must be one of [value_override, value_adjustment, percentage_adjustment]]`);
        }));

      it('validates that the amount attribute is a positive number when type is value_override', () =>
        specRequest({
          url: uri,
          method,
          headers: {authorization: signToken({scope: ['customer:1']})},
          payload: Object.assign({}, parameters, {type: 'value_override', amount: -1})
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', `child "amount" fails because ["amount" must be a positive number]`);
        }));

      it('validates that the amount attribute is a positive number when type is percentage_adjustment', () =>
        specRequest({
          url: uri,
          method,
          headers: {authorization: signToken({scope: ['customer:1']})},
          payload: Object.assign({}, parameters, {type: 'percentage_adjustment', amount: -1})
        })
        .then(response => {
          expect(response.statusCode).to.equal(400);
          expect(response.result).to.have.property('message', `child "amount" fails because ["amount" must be a positive number]`);
        }));
    });
  });
});
