const { query } = require('faunadb');
const { initClient } = require('/opt/nodejs/utils/faunadb');
const jwt = require('/opt/nodejs/utils/jwt');
const { getAuthTokenFromHeaders } = require('/opt/nodejs/utils/helpers');

const counts = {
  receivedContactRequestCount: {
    index: 'contactRequestsByRecipient'
  },
  notificationsCount: {
    index: 'notificationsByUserId',
    vars: [1]
  }
};

module.exports.handler = async ({ headers }) => {
  let count = 0;

  try {
    const {
      data: { id }
    } = await jwt.verify(getAuthTokenFromHeaders(headers));

    const client = initClient();

    count = await client.query(
      Object.keys(counts).reduce((accumulator, key) => {
        const { index, vars } = counts[key];

        accumulator[key] = query.Count(
          query.Select(
            ['data'],
            query.Paginate(query.Match(query.Index(index), id, ...vars), { size: 1000 })
          )
        );

        return accumulator;
      }, {})
    );
  } catch (error) {
    console.log(error);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(count)
  };
};
