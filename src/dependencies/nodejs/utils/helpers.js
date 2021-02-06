const bcrypt = require('bcrypt');
const { isPast } = require('date-fns');

module.exports.randomNum = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

module.exports.randomCode = () =>
  Math.random().toString(32).substr(2);
module.exports.hash = value => bcrypt.hash(value, 10);

module.exports.getAuthTokenFromHeaders = ({ Authorization }) => {
  return Authorization.replace(/bearer/gim, '').trim();
};

module.exports.verifyHash = (plainValue, hashedValue) => {
  return bcrypt.compare(plainValue, hashedValue);
};

module.exports.hasTimePassed = futureTime => {
  return !futureTime || !isPast(new Date(futureTime));
};

module.exports.sanitizeFormBody = data => {
  return Object.keys(data).reduce((accumulator, field) => {
    const value = data[field];

    if (typeof value === 'string') {
      accumulator[field] = value
        .trim()
        .replace(/ {2,}/gim, ' ')
        .replace(/\n /gim, '\n')
        .replace(/\n{3,}/gim, '\n\n');
    } else {
      accumulator[field] = value;
    }

    return accumulator;
  }, {});
};

module.exports.wait = timeMs => {
  return new Promise(resolve => setTimeout(resolve, timeMs));
};
