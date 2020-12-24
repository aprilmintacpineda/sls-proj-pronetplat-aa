module.exports = Authorization => {
  const token = Authorization.substr(7);
  return token;
};
