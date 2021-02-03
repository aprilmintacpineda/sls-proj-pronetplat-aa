const { query } = require('faunadb');
const { initClient } = require('dependencies/nodejs/utils/faunadb');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');

module.exports.handler = async ({
  headers,
  queryStringParameters
}) => {
  try {
    const { data: authUser } = await jwt.verify(
      getAuthTokenFromHeaders(headers)
    );

    const client = initClient();
    const { nextToken: after } = queryStringParameters || {};

    const result = await client.query(
      query.Map(
        query.Paginate(
          query.Match(
            query.Index('userBlockingsByBlockerId'),
            authUser.id
          ),
          {
            size: 20,
            after: after
              ? query.Ref(query.Collection('userBlockings'), after)
              : []
          }
        ),
        query.Lambda(
          ['ref', 'userId'],
          query.Get(
            query.Ref(query.Collection('users'), query.Var('userId'))
          )
        )
      )
    );

    const data = result.data.map(document => ({
      ...document.data,
      id: document.ref.id
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
