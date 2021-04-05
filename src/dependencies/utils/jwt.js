const { promisify } = require('util');
const jwt = require('jsonwebtoken');

const validityPeriod = '7d';

const signConfig = {
  expiresIn: validityPeriod,
  algorithm: 'HS512'
};

const verifyConfig = { maxAge: validityPeriod };

const signAsync = promisify(jwt.sign);
const verifyAsync = promisify(jwt.verify);
const secret = '__JWTSecret__';

module.exports.sign = async data => {
  return signAsync({ data }, secret, signConfig);
};

module.exports.verify = async token => {
  return verifyAsync(token, secret, verifyConfig);
};

module.exports.decode = async token => {
  return verifyAsync(token, secret, { maxAge: '999999d' });
};

module.exports.TokenExpiredError = jwt.TokenExpiredError;
module.exports.NotBeforeError = jwt.NotBeforeError;
module.exports.JsonWebTokenError = jwt.JsonWebTokenError;
