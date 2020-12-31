const { query, Client } = require('faunadb');

module.exports.initClient = () => {
  return new Client({
    secret: 'fnAD9q43t4ACDb-_cBDCkcUxWHj303eieg8caCWg'
  });
};

module.exports.getTimeOffset = (isPast = false) => {
  if (isPast) return query.TimeSubtract(query.Now(), 5, 'minutes');
  return query.TimeAdd(query.Now(), 5, 'minutes');
};
