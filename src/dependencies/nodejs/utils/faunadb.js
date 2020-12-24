const faunadb = require('faunadb');

module.exports.initClient = () =>
  new faunadb.Client({
    secret: 'fnAD9q43t4ACDb-_cBDCkcUxWHj303eieg8caCWg'
  });
