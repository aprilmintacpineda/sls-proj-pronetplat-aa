const bcrypt = require('bcrypt');
const { isPast } = require('date-fns');

module.exports.randomNum = (min = 11111111, max = 99999999) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

module.exports.randomCode = () => {
  let code = '';

  // lowercase "L" and uppercase "i" are both ambiguous
  do code = Math.random().toString(32).substr(2);
  while (code.includes('l') || code.includes('I'));

  return code;
};

module.exports.hash = value => bcrypt.hash(value, 10);

module.exports.verifyHash = (plainValue, hashedValue) => {
  return bcrypt.compare(plainValue, hashedValue);
};

module.exports.hasTimePassed = futureTime => {
  return !futureTime || isPast(new Date(futureTime));
};

function cleanExtraSpaces (value, isMultiline = true) {
  if (isMultiline) {
    return value
      .replace(/ {2,}/gim, ' ')
      .replace(/\n /gim, '\n')
      .replace(/\n{3,}/gim, '\n\n')
      .trim();
  }

  return value.replace(/\n/gim, ' ').replace(/ {2,}/gim, ' ').trim();
}

module.exports.cleanExtraSpaces = cleanExtraSpaces;

module.exports.sanitizeFormBody = data => {
  return Object.keys(data).reduce((accumulator, field) => {
    const value = data[field];

    if (typeof value === 'string')
      accumulator[field] = cleanExtraSpaces(value);
    else accumulator[field] = value;

    return accumulator;
  }, {});
};

module.exports.sleep = seconds => {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};
