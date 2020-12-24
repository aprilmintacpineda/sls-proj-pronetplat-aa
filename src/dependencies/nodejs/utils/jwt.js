const path = require('path');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;

const validityPeriod = '7d';

const signConfig = {
  expiresIn: validityPeriod,
  algorithm: 'RS256'
};

const verifyConfig = { maxAge: validityPeriod };

const signAsync = promisify(jwt.sign);
const verifyAsync = promisify(jwt.verify);

module.exports.sign = async data => {
  const file = await fs.readFile(path.join(__dirname, '../resources/jwt.key'));
  const privateKey = file.toString();
  return await signAsync(data, privateKey, signConfig);
};

module.exports.verify = async token => {
  const file = await fs.readFile(path.join(__dirname, '../resources/jwt.pub'));
  const publicKey = file.toString();
  return verifyAsync(token, publicKey, verifyConfig);
};
