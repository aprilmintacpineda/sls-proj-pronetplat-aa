const { query } = require('faunadb');

const jwt = require('/opt/nodejs/utils/jwt');
const { parseAuth } = require('/opt/nodejs/utils/helpers');
const { initClient } = require('/opt/nodejs/utils/faunadb');

module.exports.handler = async ({ queryStringParameters, headers }) => {
  const { nextToken: after = null } = queryStringParameters || {};
  let data = [];
  let nextToken = null;

  try {
    const {
      data: { id }
    } = await jwt.verify(parseAuth(headers));
    const client = initClient();
    const options = { size: 20 };

    // important: Options must NOT include `after` if it's falsy
    if (after) options.after = query.Ref(query.Collection('contactRequests'), after);

    const result = await client.query(
      query.Map(
        query.Paginate(
          query.Match(query.Index('contactRequestsByRecipient'), id),
          options
        ),
        query.Lambda(
          ['ref'],
          query.Let(
            {
              data: query.Select(['data'], query.Get(query.Var('ref'))),
              sender: query.Select(
                ['data'],
                query.Get(
                  query.Ref(
                    query.Collection('users'),
                    query.Select(['senderId'], query.Var('data'))
                  )
                )
              )
            },
            query.Merge(query.Var('data'), {
              id: query.Select(['id'], query.Var('ref')),
              sender: {
                id: query.Select(['senderId'], query.Var('data')),
                firstName: query.Select(['firstName'], query.Var('sender')),
                middleName: query.Select(['middleName'], query.Var('sender')),
                surname: query.Select(['surname'], query.Var('sender')),
                gender: query.Select(['gender'], query.Var('sender')),
                profilePicture: query.Select(
                  ['profilePicture'],
                  query.Var('sender'),
                  null
                )
              }
            })
          )
        )
      )
    );

    data = result.data || [];
    nextToken = result.nextToken || null;
  } catch (error) {
    console.log('error', error);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      data,
      nextToken
    })
  };
};
