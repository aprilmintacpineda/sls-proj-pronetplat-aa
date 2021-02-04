const { query } = require('faunadb');
const { initClient } = require('dependencies/nodejs/utils/faunadb');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const {
  throwIfNotCompletedSetup
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

    console.log(result);

    throw new Error('test');

    // const data = result.data.map(document => ({
    //   ...document.data,
    //   id: document.ref.id
    // }));

    // return {
    //   statusCode: 200,
    //   body: JSON.stringify({
    //     data,
    //     nextToken: result.after?.[0].id || null
    //   })
    // };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
