const faunadb = require('faunadb');

function initClient () {
  return new faunadb.Client({
    secret: 'fnAD9q43t4ACDb-_cBDCkcUxWHj303eieg8caCWg'
  });
}

module.exports.initClient = initClient;
module.exports.q = faunadb.query;
