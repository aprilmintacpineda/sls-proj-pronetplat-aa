const { query } = require('faunadb');
const { initClient } = require('dependencies/nodejs/utils/faunadb');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const {
  getUserPublicResponseDataQuery
} = require('dependencies/nodejs/utils/users');

module.exports.handler = async ({
  headers,
  queryStringParameters
}) => {
  try {
    const { data: authUser } = jwt.verify(
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
          ['ref'],
          query.Let(
            {
              userId: query.Select(
                ['data', 'userId'],
                query.Get(query.Var('ref'))
              ),
              user: query.Select(
                ['data'],
                query.Get(
                  query.Ref(
                    query.Collection('users'),
                    query.Var('userId')
                  )
                )
              )
            },
            getUserPublicResponseDataQuery(
              query.Var('userId'),
              query.Var('user')
            )
          )
        )
      )
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: result.data,
        nextToken: result.after?.[0].id || null
      })
    };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
