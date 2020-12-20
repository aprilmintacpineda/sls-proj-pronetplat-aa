function parseAuthorization (Authorization) {
  const token = Authorization.substr(7);
  return token;
}

module.exports = parseAuthorization;
