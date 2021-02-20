const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');
const {
  checkRequiredHeaderValues
} = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const { hasCompletedSetup } = require('dependencies/utils/users');

module.exports.handler = async ({
  headers,
  queryStringParameters
}) => {
  const headerValues = checkRequiredHeaderValues(headers);

  if (!headerValues) {
    console.log('Invalid headers');
    return { statusCode: 400 };
  }

  const { data: authUser } = await jwt.verify(
    headerValues.authToken
  );

  if (!hasCompletedSetup(authUser)) {
    console.log('Not yet completed setup');
    return { statusCode: 403 };
  }

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
        ['firstName', 'middleName', 'lastName', 'ref'],
        query.Get(query.Var('ref'))
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
};
