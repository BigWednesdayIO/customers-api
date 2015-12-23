'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const expect = require('chai').expect;

const signToken = require('./sign_jwt');
const specRequest = require('./spec_request');

const parameters = require('./parameters/product_price_adjustment');

const createCustomerWithMembership = () => {
  return specRequest({
    url: '/customers',
    method: 'POST',
    payload: {email: `test-${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'}
  }).then(customerResponse => {
    const token = signToken({scope: [`customer:${customerResponse.result.id}`]});

    return specRequest({
      url: `/customers/${customerResponse.result.id}/memberships`,
      method: 'POST',
      payload: require('./parameters/membership'),
      headers: {authorization: token}
    }).then(membershipResponse => ({
      uri: membershipResponse.headers.location,
      token
    }));
  });
};

describe('/customers/{id}/memberships/{id}/product_price_adjustments/{id}', () => {
  describe('get', () => {
    let createdCustomerMembership;
    let createdAdjustment;
    let getResponse;

    before(() =>
      createCustomerWithMembership()
        .then(customerMembership => {
          createdCustomerMembership = customerMembership;

          return specRequest({
            url: `${customerMembership.uri}/product_price_adjustments`,
            method: 'POST',
            headers: {authorization: customerMembership.token},
            payload: parameters
          })
          .then(response => {
            createdAdjustment = response.result;

            return specRequest({
              url: response.headers.location,
              method: 'GET',
              headers: {authorization: customerMembership.token}
            });
          });
        })
        .then(response => getResponse = response));

    it('returns http 200', () => expect(getResponse.statusCode).to.equal(200));

    it('returns id', () => expect(getResponse.result).to.have.property('id', createdAdjustment.id));

    it('returns the created and updated date', () => {
      expect(getResponse.result).to.have.property('_metadata');
      expect(getResponse.result._metadata).to.have.property('created');
      expect(getResponse.result._metadata).to.have.property('updated');
      expect(getResponse.result._metadata.created).to.deep.equal(createdAdjustment._metadata.created);
      expect(getResponse.result._metadata.updated).to.deep.equal(createdAdjustment._metadata.updated);
    });

    it('returns the resource attributes', () =>
      expect(_.omit(getResponse.result, 'id', '_metadata')).to.deep.equal(parameters));

    it('returns http 404 when adjustment does not exist', () =>
      specRequest({
        url: `${createdCustomerMembership.uri}/product_price_adjustments/notfound`,
        method: 'GET',
        headers: {authorization: createdCustomerMembership.token}
      })
      .then(response => expect(response.statusCode).to.equal(404)));
  });

  describe('delete', () => {
    let deleteResponse;
    let getResponse;

    before(() =>
      createCustomerWithMembership()
        .then(customerMembership => {
          return specRequest({
            url: `${customerMembership.uri}/product_price_adjustments`,
            method: 'POST',
            headers: {authorization: customerMembership.token},
            payload: parameters
          })
          .then(createResponse =>
            specRequest({
              url: createResponse.headers.location,
              method: 'DELETE',
              headers: {authorization: customerMembership.token}
            })
            .then(response => {
              deleteResponse = response;

              return specRequest({
                url: createResponse.headers.location,
                method: 'GET',
                headers: {authorization: customerMembership.token}
              });
            })
            .then(response => getResponse = response));
        }));

    it('returns http 204', () => expect(deleteResponse.statusCode).to.equal(204));

    it('deletes the resource', () => expect(getResponse.statusCode).to.equal(404));
  });
});
