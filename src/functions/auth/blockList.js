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
  headers,
  queryStringParameters
}) => {
  try {
    const { data: authUser } = await jwt.verify(
      getAuthTokenFromHeaders(headers)
    );

    throwIfNotCompletedSetup(authUser);

    const client = initClient();
    const { nextToken: after } = queryStringParameters || {};

    const result = await client.query(
      query.Map(
        query.Paginate(
          query.Join(
            query.Match(
              query.Index('userBlockingsByBlockerId'),
              authUser.id
            ),
            query.Lambda(
              ['userId', 'ref'],
              query.Match(
                query.Index('userRefSortedByFullName'),
                query.Ref(
                  query.Collection('users'),
                  query.Var('userId')
                )
              )
            )
          ),
          {
            size: 20,
            after: after
              ? query.Ref(query.Collection('userBlockings'), after)
              : []
          }
        ),
        query.Lambda(
          ['userId', 'ref'],
          query.Get(
            query.Ref(query.Collection('users'), query.Var('userId'))
          )
        )
      )
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: result.data.map(document => ({
          ...document.data,
          id: document.ref.id
        })),
        nextToken: result.after?.[0].id || null
      })
    };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
