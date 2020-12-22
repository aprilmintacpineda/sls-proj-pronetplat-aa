const bcrypt = require('bcrypt');

const hashSaltRounds = 10;

function randomCode () {
  return Math.random().toString(32).substr(2, 5);
}

function hash (value) {
  return bcrypt.hash(value, hashSaltRounds);
}

module.exports.randomCode = randomCode;
module.exports.hash = hash;