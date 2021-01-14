const { query } = require('faunadb');

const jwt = require('/opt/nodejs/utils/jwt');
const {
  getAuthTokenFromHeaders
} = require('/opt/nodejs/utils/helpers');
const { initClient } = require('/opt/nodejs/utils/faunadb');

module.exports.handler = async ({
  queryStringParameters,
  headers
}) => {
  try {
    const {
      data: { id }
    } = await jwt.verify(getAuthTokenFromHeaders(headers));
    const client = initClient();
    const options = { size: 20 };

    // important: Options must NOT include `after` if it's falsy
    const { nextToken: after = null } = queryStringParameters || {};
    if (after) {
      options.after = query.Ref(
        query.Collection('contactRequests'),
        after
      );
    }

    const result = await client.query(
      query.Map(
        query.Paginate(
          query.Match(
            query.Index('contactRequestsByRecipientId'),
            id
          ),
          options
        ),
        query.Lambda(
          ['ref'],
          query.Let(
            {
              data: query.Select(
                ['data'],
                query.Get(query.Var('ref'))
              ),
              senderId: query.Select(['senderId'], query.Var('data')),
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
                gender: query.Select(['gender'], query.Var('sender')),
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
