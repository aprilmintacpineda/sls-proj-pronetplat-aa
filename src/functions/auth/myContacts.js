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
    console.log('invalid headers');
    return { statusCode: 400 };
  }

  let authUser;

  try {
    const token = await jwt.verify(headerValues.authToken);
    authUser = token.data;
  } catch (error) {
    console.log('Invalid token');
    return { statusCode: 401 };
  }

  if (!hasCompletedSetup(authUser)) {
    console.log('Not yet setup');
    return { statusCode: 403 };
  }

  const client = initClient();
  const { nextToken: after } = queryStringParameters || {};

  const result = await client.query(
    query.Map(
      query.Paginate(
        query.Match(query.Index('contactsByOwnerId'), authUser.id),
        {
          size: 20,
          after: after
            ? query.Ref(query.Collection('contacts'), after)
            : []
        }
      ),
      query.Lambda(
        ['numTimesOpened', 'contactId', 'ref'],
        query.Get(
          query.Ref(
            query.Collection('users'),
            query.Var('contactId')
          )
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
};
