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
  console.log('secret', secret);
  return signAsync({ data }, secret, signConfig);
};

module.exports.verify = async token => {
  console.log('secret', secret);
  return verifyAsync(token, secret, verifyConfig);
};

module.exports.TokenExpiredError = jwt.TokenExpiredError;
module.exports.NotBeforeError = jwt.NotBeforeError;
module.exports.JsonWebTokenError = jwt.JsonWebTokenError;
