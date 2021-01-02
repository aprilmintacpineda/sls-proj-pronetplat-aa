const bcrypt = require('bcrypt');
const {
  values: { FaunaTime, FaunaDate }
} = require('faunadb');

module.exports.randomCode = () => Math.random().toString(32).substr(2);
module.exports.hash = value => bcrypt.hash(value, 10);

module.exports.parseAuth = ({ Authorization }) => {
  return Authorization.replace(/bearer/gim, '').trim();
};

module.exports.verifyHash = (plainValue, hashedValue) => {
  return bcrypt.compare(plainValue, hashedValue);
};

module.exports.hasTimePassed = futureTime => {
  return !futureTime || new Date() > new Date(futureTime);
};

module.exports.sanitizeFormBody = data => {
  return Object.keys(data).reduce((accumulator, field) => {
    if (typeof accumulator[field] === 'string')
      accumulator[field] = data[field].trim().replace(/\s{2,}/gim, ' ');
    else accumulator[field] = data[field];

    return accumulator;
  }, {});
};

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

module.exports.normalizeData = normalizeData;
