const { query } = require('faunadb');
const { initClient } = require('/opt/nodejs/utils/faunadb');
const jwt = require('/opt/nodejs/utils/jwt');
const { getAuthTokenFromHeaders } = require('/opt/nodejs/utils/helpers');

const counts = [
  {
    name: 'receivedContactRequest',
    index: 'contactRequestsByRecipient'
  },
  {
    name: 'notifications',
    index: 'notificationsByUserId'
  }
];

module.exports.handler = async ({ headers }) => {
  const count = 0;

  try {
    const {
      data: { id }
    } = await jwt.verify(getAuthTokenFromHeaders(headers));

    const client = initClient();

    const result = await client.query(
      counts.reduce((accumulator, { name, index }) => {
        accumulator[name] = query.Select(
          ['data', '0'],
          query.Count(query.Paginate(query.Match(query.Index(index), id)))
        );

        return accumulator;
      }, {})
    );

    console.log(result);
  } catch (error) {
    console.log(error);
  }

  return {
    statusCode: 200,
    body: count
  };
};
