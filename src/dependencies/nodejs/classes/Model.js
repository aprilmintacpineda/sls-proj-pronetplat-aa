function normalizeData (unnormalizedData) {
  switch (unnormalizedData.constructor) {
    case Array:
      return unnormalizedData.map(field => normalizeData(field));
    case Object:
      if ('@ts' in unnormalizedData) return unnormalizedData['@ts'];
      return Object.keys(unnormalizedData)
        .reduce((accumulator, key) => {
          accumulator[key] = normalizeData(unnormalizedData[key]);
          return accumulator;
        }, {});
  }

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