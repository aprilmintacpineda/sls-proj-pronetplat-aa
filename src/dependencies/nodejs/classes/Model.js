const { values: { FaunaTime, FaunaDate } } = require('faunadb');

function normalizeData (unnormalizedData) {
  switch (unnormalizedData.constructor) {
    case Array:
      return unnormalizedData.map(field => normalizeData(field));
    case Object:
      return Object.keys(unnormalizedData)
        .reduce((accumulator, key) => {
          accumulator[key] = normalizeData(unnormalizedData[key]);
          return accumulator;
        }, {});
  }

  if ('value' in unnormalizedData) return unnormalizedData.value;
  return unnormalizedData;
}

class Model {
  constructor (instance) {
    this.instance = instance;
    this.data = normalizeData(this.instance.data);
    console.log('model', JSON.stringify(this.data, null, 2));
  }

  toString () {
    return JSON.stringify(this.data);
  }
}

module.exports = Model;