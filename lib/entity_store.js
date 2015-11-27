'use strict';

const _ = require('lodash');
const dataset = require('./dataset');

class EntityNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EntityNotFoundError';
  }
}

const flattenMetadata = entity => {
  const flattened = {};

  _.forOwn(entity._metadata, (value, key) => {
    flattened[`_metadata_${key}`] = value;
  });

  return Object.assign(flattened, _.omit(entity, '_metadata'));
};

const expandMetadata = entity => {
  return _.transform(entity, (accum, value, key) => {
    if (key.startsWith('_metadata_')) {
      accum._metadata[key.replace('_metadata_', '')] = value;
    } else {
      accum[key] = value;
    }
    return accum;
  }, {_metadata: {}});
};

const save = (key, entity, method) => {
  const storedEntity = flattenMetadata(entity);
  return new Promise((resolve, reject) => {
    dataset.save({key, method, data: storedEntity}, err => {
      if (err) {
        return reject(err);
      }

      resolve(Object.assign({id: _.last(key.path)}, entity));
    });
  });
};

const entityStore = {
  get(key) {
    return new Promise((resolve, reject) => {
      dataset.get(key, (err, retrievedEntity) => {
        if (err) {
          return reject(err);
        }
        if (!retrievedEntity) {
          return reject(new EntityNotFoundError());
        }

        const entity = expandMetadata(retrievedEntity.data);
        entity.id = _.last(retrievedEntity.key.path);
        resolve(entity);
      });
    });
  },

  create(key, entity) {
    return save(key, Object.assign({_metadata: {created: new Date()}}, entity), 'insert');
  },

  update: _.partialRight(save, 'update'),

  runQuery(query) {
    return new Promise((resolve, reject) => {
      dataset.runQuery(query, (err, results) => {
        if (err) {
          return reject(err);
        }

        resolve(results.map(r => {
          const entity = expandMetadata(r.data);
          entity.id = _.last(r.key.path);
          return entity;
        }));
      });
    });
  }
};

module.exports = entityStore;
