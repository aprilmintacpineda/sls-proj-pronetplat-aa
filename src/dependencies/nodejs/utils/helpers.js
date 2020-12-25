const bcrypt = require('bcrypt');

module.exports.randomCode = () => Math.random().toString(32).substr(2);
module.exports.hash = value => bcrypt.hash(value, 10);
module.exports.verifyHash = (plainValue, hashedValue) =>
  bcrypt.compare(plainValue, hashedValue);

module.exports.hasTimePassed = futureTime =>
  !futureTime || new Date() > new Date(futureTime);
