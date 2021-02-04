const { query } = require('faunadb');
const { initClient } = require('dependencies/nodejs/utils/faunadb');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const {
  throwIfNotCompletedSetup,
  getUserPublicResponseData
} = require('dependencies/nodejs/utils/users');

module.exports.handler = async ({
  queryStringParameters,
  headers
}) => {
  try {
    const { data: authUser } = await jwt.verify(
      getAuthTokenFromHeaders(headers)
    );

    throwIfNotCompletedSetup(authUser);

    const client = initClient();
    const { nextToken: after = null } = queryStringParameters || {};

    const result = await client.query(
      query.Map(
        query.Paginate(
          query.Match(
            query.Index('contactRequestsByRecipientId'),
            authUser.id
          ),
          {
            size: 20,
            after: after
              ? query.Ref(query.Collection('contactRequests'), after)
              : []
          }
        ),
        query.Lambda(['ref', 'senderId'], {
          contactRequest: query.Get(query.Var('ref')),
          sender: query.Get(
            query.Ref(
              query.Collection('users'),
              query.Var('senderId')
            )
          )
        })
      )
    );

    console.log(JSON.stringify(result, null, 2));

    const data = result.data.map(({ contactRequest, sender }) => ({
      ...contactRequest.data,
      sender: {
        ...getUserPublicResponseData(sender.data),
        id: sender.ref.id
      }
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        data,
        nextToken: result.after?.[0].id || null
      })
    };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
