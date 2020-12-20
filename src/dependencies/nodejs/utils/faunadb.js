const faunadb = require('faunadb');

function initClient () {
  return new faunadb.Client({
    secret: 'fnAD1s8eO4ACDJVZQkrJJ0PVLVliXNDDG9K7wn2k'
  });
}

module.exports.initClient = initClient;
module.exports.q = faunadb.query;
