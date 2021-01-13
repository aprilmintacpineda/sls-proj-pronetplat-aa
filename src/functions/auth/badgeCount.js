const { query } = require('faunadb');
const { initClient } = require('/opt/nodejs/utils/faunadb');
const jwt = require('/opt/nodejs/utils/jwt');
const { getAuthTokenFromHeaders } = require('/opt/nodejs/utils/helpers');

const badgeIndexes = {
  receivedContactRequestCount: {
    index: 'contactRequestsByRecipientId'
  },
  notificationsCount: {
    index: 'notificationsByUserIdIsNew',
    params: [1]
  }
};

module.exports.handler = async ({ headers }) => {
  try {
    const {
      data: { id }
    } = await jwt.verify(getAuthTokenFromHeaders(headers));

    const client = initClient();

    const badges = await client.query(
      Object.keys(badgeIndexes).reduce((accumulator, key) => {
        const { index, params = [] } = badgeIndexes[key];
        accumulator[key] = query.Count(query.Match(query.Index(index), id, ...params));
        return accumulator;
      }, {})
    );

    return {
      statusCode: 200,
      body: JSON.stringify(badges)
    };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
