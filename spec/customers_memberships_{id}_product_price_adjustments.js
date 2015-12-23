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

describe('/customers/{id}/memberships/{id}/product_price_adjustments', () => {
  describe('post', () => {
    let createResponse;

    before(() =>
      createCustomerWithMembership()
        .then(customerMembership => specRequest({
          url: `${customerMembership.uri}/product_price_adjustments`,
          method: 'POST',
          headers: {authorization: customerMembership.token},
          payload: parameters
        }))
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
      expect(_.omit(createResponse.result, 'id', '_metadata')).to.deep.equal(parameters);
    });

    it('returns the location of the created resource', () =>
      expect(createResponse.headers.location).to.equal(`${createResponse.request.url.path}/${createResponse.result.id}`));

    it('returns http 404 for unknown customers', () =>
      specRequest({
        url: '/customers/notfound/memberships/1/product_price_adjustments',
        method: 'POST',
        headers: {authorization: signToken({scope: [`customer:notfound`]})},
        payload: parameters
      }).then(response => {
        expect(response.statusCode).to.equal(404);
        expect(response.result).to.have.property('message', 'Customer "notfound" not found.');
      }));
  });

  describe('get', () => {
    const createdAdjustments = [];
    let getResponse;
    let createdCustomerMembership;
    const payload2 = Object.assign({}, parameters, {product_id: 'product2'});

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
            createdAdjustments.push(response.result);

            return specRequest({
              url: `${customerMembership.uri}/product_price_adjustments`,
              method: 'POST',
              headers: {authorization: customerMembership.token},
              payload: payload2
            });
          })
          .then(response => {
            createdAdjustments.push(response.result);

            return specRequest({
              url: `${customerMembership.uri}/product_price_adjustments`,
              method: 'GET',
              headers: {authorization: customerMembership.token}
            });
          });
        })
        .then(response => getResponse = response));

    it('returns http 200', () => expect(getResponse.statusCode).to.equal(200));

    it('returns all adjustments for the membership', () => {
      expect(getResponse.result).to.be.an('array');
      expect(getResponse.result).to.have.length(createdAdjustments.length);
    });

    it('returns the ids', () =>
      getResponse.result.forEach((adjustment, index) => expect(adjustment).to.have.property('id', createdAdjustments[index].id)));

    it('returns the created and updated dates', () =>
      getResponse.result.forEach((adjustment, index) => {
        expect(adjustment).to.have.property('_metadata');
        expect(adjustment._metadata).to.have.property('created');
        expect(adjustment._metadata).to.have.property('updated');
        expect(adjustment._metadata.created).to.deep.equal(createdAdjustments[index]._metadata.created);
        expect(adjustment._metadata.updated).to.deep.equal(createdAdjustments[index]._metadata.updated);
      }));

    it('returns the resource attributes', () => {
      expect(_.omit(getResponse.result[0], 'id', '_metadata')).to.deep.equal(parameters);
      expect(_.omit(getResponse.result[1], 'id', '_metadata')).to.deep.equal(payload2);
    });

    it('gets the price adjustment for a specific product', () =>
      specRequest({
        url: `${createdCustomerMembership.uri}/product_price_adjustments?product_id=product2`,
        method: 'GET',
        headers: {authorization: createdCustomerMembership.token}
      })
      .then(response => {
        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an('array');
        expect(response.result).to.have.length(1);
        expect(_.omit(response.result[0], 'id', '_metadata')).to.deep.equal(payload2);
      }));

    it('returns http 404 for unknown customers', () =>
      specRequest({
        url: '/customers/notfound/memberships/1/product_price_adjustments',
        method: 'GET',
        headers: {authorization: signToken({scope: [`customer:notfound`]})}
      }).then(response => {
        expect(response.statusCode).to.equal(404);
        expect(response.result).to.have.property('message', 'Customer "notfound" not found.');
      }));
  });
});
