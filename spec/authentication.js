'use strict';

const _ = require('lodash');
const specRequest = require('./spec_request');
const expect = require('chai').expect;
const signToken = require('./sign_jwt');

describe('authentication', () => {
  require('../lib/server')((err, server) => {
    if (err) {
      throw new Error(err);
    }

    _(server.table()[0].table)
      .filter(route => {
        return !_.includes(['/swagger', '/version', '/customers/authenticate'], route.path) &&
          !(route.path === '/customers' && route.method === 'post');
      })
      .value()
      .forEach(route => {
        it(`requires token to ${route.method} to ${route.path} `, () => {
          return specRequest({
            url: route.path,
            method: route.method
          })
          .then(response => {
            expect(response.statusCode).to.equal(401);
          });
        });

        it(`requires un-expired token to ${route.method} to ${route.path} `, () => {
          const token = signToken({}, {expiresIn: '0'});

          return specRequest({
            url: `${route.path}?token=${token}`,
            method: route.method
          })
          .then(response => {
            expect(response.statusCode).to.equal(401);
            expect(response.result.message).to.equal('Token expired');
          });
        });

        it(`requires correct issuer to ${route.method} to ${route.path} `, () => {
          const token = signToken({}, {issuer: 'http://unknown_issuer/'});

          return specRequest({
            url: `${route.path}?token=${token}`,
            method: route.method
          })
          .then(response => {
            expect(response.statusCode).to.equal(401);
            expect(response.result.message).to.equal('Invalid token');
          });
        });

        it(`requires correct audience to ${route.method} to ${route.path} `, () => {
          const token = signToken({}, {audience: 'some_audience'});

          return specRequest({
            url: `${route.path}?token=${token}`,
            method: route.method
          })
          .then(response => {
            expect(response.statusCode).to.equal(401);
            expect(response.result.message).to.equal('Invalid token');
          });
        });

        it(`requires correct algorithm to ${route.method} to ${route.path} `, () => {
          const token = signToken({}, {algorithm: 'HS512'});

          return specRequest({
            url: `${route.path}?token=${token}`,
            method: route.method
          })
          .then(response => {
            expect(response.statusCode).to.equal(401);
            expect(response.result.message).to.equal('Invalid token');
          });
        });
      });
  });
});
