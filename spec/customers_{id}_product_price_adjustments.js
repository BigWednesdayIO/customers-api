'use strict';

const _ = require('lodash');
const cuid = require('cuid');
const bluebird = require('bluebird');
const expect = require('chai').expect;

const signToken = require('./sign_jwt');
const specRequest = require('./spec_request');

const membershipParameters = require('./parameters/membership');
const productPriceAdjustmentParameters = require('./parameters/product_price_adjustment');

const testDate = new Date(2015, 1, 1);

const testMemberships = [
  {
    membership: Object.assign({}, membershipParameters, {supplier_id: 's1'}),
    price_adjustments: [
      Object.assign({}, productPriceAdjustmentParameters, {linked_product_id: 's1p1', start_date: new Date(testDate.getTime() + 10000)}),
      Object.assign({}, productPriceAdjustmentParameters, {linked_product_id: 's1p2', start_date: testDate, end_date: new Date(testDate.getTime() + 10000)}),
      Object.assign({}, productPriceAdjustmentParameters, {linked_product_id: 's1p3', start_date: new Date(testDate.getTime() - 10000), end_date: new Date(testDate.getTime() - 1000)})
    ]
  },
  {
    membership: Object.assign({}, membershipParameters, {supplier_id: 's2'}),
    price_adjustments: [
      _.omit(Object.assign({}, productPriceAdjustmentParameters, {linked_product_id: 's2p1', start_date: testDate}), 'end_date'),
      Object.assign({}, productPriceAdjustmentParameters, {linked_product_id: 's2p2', start_date: testDate, end_date: testDate}),
      Object.assign({}, productPriceAdjustmentParameters, {linked_product_id: 's2p3', start_date: testDate, end_date: new Date(testDate.getTime() + 10000)})
    ]
  },
  {
    membership: Object.assign({}, membershipParameters, {supplier_id: 's3'}),
    price_adjustments: [
      Object.assign({}, productPriceAdjustmentParameters, {linked_product_id: 's3p1', start_date: testDate, end_date: new Date(testDate.getTime() + 10000)}),
      Object.assign({}, productPriceAdjustmentParameters, {linked_product_id: 's3p2', start_date: testDate, end_date: new Date(testDate.getTime() + 10000)}),
      Object.assign({}, productPriceAdjustmentParameters, {linked_product_id: 's3p3', start_date: testDate, end_date: new Date(testDate.getTime() + 10000)})
    ]
  }
];

describe('/customers/{id}/product_price_adjustments', () => {
  describe('get', function () {
    this.timeout(5000);

    let getResponse;

    before(() =>
      specRequest({
        url: '/customers',
        method: 'POST',
        payload: {email: `test-${cuid()}@bigwednesday.io`, password: '8u{F0*W1l5'}
      }).then(customerResponse => {
        const token = signToken({scope: [`customer:${customerResponse.result.id}`]});

        return bluebird.mapSeries(testMemberships, m =>
          specRequest({
            url: `/customers/${customerResponse.result.id}/memberships`,
            method: 'POST',
            payload: m.membership,
            headers: {authorization: token}
          })
          .then(membershipResponse => bluebird.mapSeries(m.price_adjustments, a =>
            specRequest({
              url: `${membershipResponse.headers.location}/product_price_adjustments`,
              method: 'POST',
              payload: a,
              headers: {authorization: token}
            })))
          .then(() =>
            specRequest({
              url: `/customers/${customerResponse.result.id}/product_price_adjustments?date=${testDate.toISOString()}`,
              method: 'GET',
              headers: {authorization: token}
            }))
          .then(response => getResponse = response));
      }));

    it('returns http 200', () => expect(getResponse.statusCode).to.equal(200));

    it('returns all adjustments active on the date', () => {
      const activeAdjustments = [
        testMemberships[0].price_adjustments[1],
        testMemberships[1].price_adjustments[0],
        testMemberships[1].price_adjustments[1],
        testMemberships[1].price_adjustments[2],
        testMemberships[2].price_adjustments[0],
        testMemberships[2].price_adjustments[1],
        testMemberships[2].price_adjustments[2]
      ];

      expect(getResponse.result.map(a => _.omit(a, 'id', '_metadata'))).to.deep.equal(activeAdjustments);
    });

    it('returns http 404 for unknown customers', () =>
      specRequest({
        url: `/customers/notfound/product_price_adjustments?date=${new Date()}`,
        method: 'GET',
        headers: {authorization: signToken({scope: [`customer:notfound`]})}
      })
        .then(response => {
          expect(response.statusCode).to.equal(404);
          expect(response.result).to.have.property('message', 'Customer "notfound" not found.');
        }));
  });
});
