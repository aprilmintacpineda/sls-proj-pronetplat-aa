const { query } = require('faunadb');
const { initClient } = require('dependencies/nodejs/utils/faunadb');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');

module.exports.handler = async ({
  queryStringParameters,
  headers
}) => {
  try {
    const { data: authUser } = await jwt.verify(
      getAuthTokenFromHeaders(headers)
    );
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
        query.Lambda(
          ['ref'],
          query.Let(
            {
              data: query.Select(
                ['data'],
                query.Get(query.Var('ref'))
              ),
              senderId: query.Select(
                ['senderId'],
                query.Var('data')
              ),
              sender: query.Select(
                ['data'],
                query.Get(
                  query.Ref(
                    query.Collection('users'),
                    query.Var('senderId')
                  )
                )
              )
            },
            query.Merge(query.Var('data'), {
              id: query.Select(['id'], query.Var('ref')),
              sender: {
                id: query.Var('senderId'),
                firstName: query.Select(
                  ['firstName'],
                  query.Var('sender')
                ),
                middleName: query.Select(
                  ['middleName'],
                  query.Var('sender')
                ),
                surname: query.Select(
                  ['surname'],
                  query.Var('sender')
                ),
                gender: query.Select(
                  ['gender'],
                  query.Var('sender')
                ),
                profilePicture: query.Select(
                  ['profilePicture'],
                  query.Var('sender'),
                  null
                ),
                jobTitle: query.Select(
                  ['jobTitle'],
                  query.Var('sender')
                ),
                company: query.Select(
                  ['company'],
                  query.Var('sender'),
                  null
                ),
                bio: query.Select(['bio'], query.Var('sender'), null)
              }
            })
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
