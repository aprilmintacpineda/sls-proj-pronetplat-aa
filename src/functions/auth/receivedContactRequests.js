const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');
const {
  checkRequiredHeaderValues
} = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const {
  throwIfNotCompletedSetup,
  getUserPublicResponseData
} = require('dependencies/utils/users');

module.exports.handler = async ({
  queryStringParameters,
  headers
}) => {
  try {
    const { authToken } = checkRequiredHeaderValues(headers);
    const { data: authUser } = await jwt.verify(authToken);

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
        query.Lambda(['senderId', 'ref'], {
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

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: result.data.map(({ contactRequest, sender }) => ({
          ...contactRequest.data,
          id: contactRequest.ref.id,
          sender: {
            ...getUserPublicResponseData(sender.data),
            id: sender.ref.id
          }
        })),
        nextToken: result.after?.[0].id || null
      })
    };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
