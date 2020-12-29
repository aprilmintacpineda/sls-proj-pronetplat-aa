const bcrypt = require('bcrypt');

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
