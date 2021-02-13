const { promisify } = require('util');
const jwt = require('jsonwebtoken');

const validityPeriod = '7d';

const signConfig = {
  expiresIn: validityPeriod,
  algorithm: 'RS256'
};

const verifyConfig = { maxAge: validityPeriod };

const signAsync = promisify(jwt.sign);
const verifyAsync = promisify(jwt.verify);

module.exports.sign = async data => {
  console.log(process.env.jwtSecret);
  return signAsync({ data }, process.env.jwtSecret, signConfig);
};

module.exports.verify = async token => {
  return verifyAsync(token, process.env.jwtSecret, verifyConfig);
};

module.exports.TokenExpiredError = jwt.TokenExpiredError;
module.exports.NotBeforeError = jwt.NotBeforeError;
module.exports.JsonWebTokenError = jwt.JsonWebTokenError;
