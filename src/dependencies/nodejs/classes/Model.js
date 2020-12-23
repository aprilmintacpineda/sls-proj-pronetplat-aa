const {
  values: { FaunaTime, FaunaDate }
} = require('faunadb');

function normalizeData (unnormalizedData) {
  switch (unnormalizedData.constructor) {
    case Array:
      return unnormalizedData.map(field => normalizeData(field));
    case Object:
      return Object.keys(unnormalizedData).reduce((accumulator, key) => {
        accumulator[key] = normalizeData(unnormalizedData[key]);
        return accumulator;
      }, {});
    case FaunaTime:
    case FaunaDate:
      return unnormalizedData.value;
  }

  return unnormalizedData;
}

class Model {
  constructor (instance) {
    this.instance = instance;
    this.data = normalizeData(instance.data);
  }

  toString () {
    return JSON.stringify(this.data);
  }
}

module.exports = Model;
