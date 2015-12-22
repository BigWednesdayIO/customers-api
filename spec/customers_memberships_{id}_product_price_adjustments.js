'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const expect = require('chai').expect;

const signToken = require('./sign_jwt');
const specRequest = require('./spec_request');

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
      membershipUri: membershipResponse.headers.location,
      token
    }));
  });
};

const payload = {product_id: 'product1', type: 'value_adjustment', amount: 15};

describe('/customers/{id}/memberships/{id}/product_price_adjustments', () => {
  describe('post', () => {
    let createResponse;
    let membershipUri;

    before(() =>
      createCustomerWithMembership()
        .then(result => {
          membershipUri = result.membershipUri;
          return specRequest({
            url: `${result.membershipUri}/product_price_adjustments`,
            method: 'POST',
            headers: {authorization: result.token},
            payload
          });
        })
        .then(response => createResponse = response));

    it('returns http 201', () =>
      expect(createResponse.statusCode).to.equal(201));

    it('returns the generated id', () => {
      expect(createResponse.result).to.have.property('id');
      expect(createResponse.result.id).to.match(/c.{24}/);
    });

    it('returns the created and updated date', () => {
      expect(createResponse.result).to.have.property('_metadata');
      expect(createResponse.result._metadata).to.have.property('created');
      expect(createResponse.result._metadata).to.have.property('updated');
      expect(createResponse.result._metadata.created).to.be.a('date');
      expect(createResponse.result._metadata.updated).to.be.a('date');
    });

    it('returns the resource attributes', () => {
      expect(_.omit(createResponse.result, 'id', '_metadata')).to.deep.equal(payload);
    });

    it('returns the location of the created resource', () =>
      expect(createResponse.headers.location).to.equal(`${membershipUri}/product_price_adjustments/${createResponse.result.id}`));
  });
});
