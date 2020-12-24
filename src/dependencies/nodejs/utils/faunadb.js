const faunadb = require('faunadb');
const { query } = faunadb;

module.exports.initClient = () =>
  new faunadb.Client({
    secret: 'fnAD9q43t4ACDb-_cBDCkcUxWHj303eieg8caCWg'
  });

module.exports.getTimeOffset = () => query.TimeAdd(query.Now(), 5, 'minutes');
