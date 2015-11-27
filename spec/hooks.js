'use strict';

const _ = require('lodash');
const nock = require('nock');
const dataset = require('../lib/dataset');
const auth0Client = require('../lib/auth0_client');

const deleteDataOfKind = kind => {
  const query = dataset.createQuery(kind);

  return new Promise((resolve, reject) => {
    dataset.runQuery(query, (err, res) => {
      if (err) {
        console.error(err);
        console.log(`Error deleting ${kind} data`);

        reject(err);
      }

      const keys = _.map(res, 'key');
      dataset.delete(keys, err => {
        if (err) {
          console.error(err);
          console.log(`Error deleting ${kind} data`);

          reject(err);
        }

        resolve();
      });
    });
  });
};

const deleteDataStoreData = () => {
  return deleteDataOfKind('Membership')
    .then(() => deleteDataOfKind('Customer'));
};

before(() => {
  nock.recorder.rec({
    dont_print: true,
    output_objects: true
  });
});

after(done => {
  const nockCallObjects = nock.recorder.play();
  const createdAuth0 = _(nockCallObjects)
    .filter({
      path: '/api/users/',
      scope: `https://${process.env.AUTH0_DOMAIN}:443`,
      method: 'POST',
      status: 200
    })
    .map(r => r.response.user_id)
    .value();

  const auth0UserDeleted = _.after(createdAuth0.length, () => {
    deleteDataStoreData().then(done);
  });

  createdAuth0.forEach(id => {
    auth0Client.deleteUser(id, auth0UserDeleted);
  });
});
