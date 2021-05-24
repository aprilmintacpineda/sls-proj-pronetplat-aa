const { promisify } = require('util');
const jwt = require('jsonwebtoken');

const validityPeriod = '7d';

const signConfig = {
  expiresIn: validityPeriod,
  algorithm: 'HS512'
};

const signAsync = promisify(jwt.sign);
const verifyAsync = promisify(jwt.verify);
const secret = '__JWTSecret__';

module.exports.sign = async data => {
  return signAsync({ data }, secret, signConfig);
};

module.exports.verify = async (token, ignoreExpiration = false) => {
  return verifyAsync(token, secret, {
    maxAge: !ignoreExpiration ? validityPeriod : null,
    ignoreExpiration
  });
};

module.exports.TokenExpiredError = jwt.TokenExpiredError;
module.exports.NotBeforeError = jwt.NotBeforeError;
module.exports.JsonWebTokenError = jwt.JsonWebTokenError;
