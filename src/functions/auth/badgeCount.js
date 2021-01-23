const { query } = require('faunadb');
const { initClient } = require('dependencies/nodejs/utils/faunadb');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');

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
    const { data: authUser } = await jwt.verify(
      getAuthTokenFromHeaders(headers)
    );

    const client = initClient();

    const badges = await client.query(
      Object.keys(badgeIndexes).reduce((accumulator, key) => {
        const { index, params = [] } = badgeIndexes[key];

        accumulator[key] = query.Count(
          query.Match(query.Index(index), authUser.id, ...params)
        );

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
