const bcrypt = require('bcrypt');
const { isPast } = require('date-fns');

module.exports.randomNum = (min = 11111111, max = 99999999) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

module.exports.randomCode = () =>
  Math.random().toString(32).substr(2);
module.exports.hash = value => bcrypt.hash(value, 10);

module.exports.checkRequiredHeaderValues = (
  headers,
  isLoggedIn = true
) => {
  console.log(JSON.stringify(headers, null, 2));

  const deviceToken = headers['device-token'];

  if (isLoggedIn && !headers.Authorization)
    throw new Error('Authorization is missing from headers');

  if (!deviceToken)
    throw new Error('DeviceToken is missing from headers');

  return {
    deviceToken,
    authToken: isLoggedIn
      ? headers.Authorization.replace(/bearer /gim, '').trim()
      : null
  };
};

module.exports.verifyHash = (plainValue, hashedValue) => {
  return bcrypt.compare(plainValue, hashedValue);
};

module.exports.hasTimePassed = futureTime => {
  return !futureTime || isPast(new Date(futureTime));
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
