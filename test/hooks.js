'use strict';

const nock = require('nock');

before(() => {
  nock.disableNetConnect();
});

after(() => {
  nock.enableNetConnect();
});
