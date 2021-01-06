const { query } = require('faunadb');

const jwt = require('/opt/nodejs/utils/jwt');
const { getAuthTokenFromHeaders, normalizeData } = require('/opt/nodejs/utils/helpers');
const { initClient } = require('/opt/nodejs/utils/faunadb');

module.exports.handler = async ({ headers, queryStringParameters }) => {
  try {
    const {
      data: { id }
    } = await jwt.verify(getAuthTokenFromHeaders(headers));
    const client = initClient();
    const options = { size: 20 };

    // important: Options must NOT include `after` if it's falsy
    const { nextToken: after } = queryStringParameters || {};
    if (after) options.after = query.Ref(query.Collection('notifications'), after);

    const result = await client.query(
      query.Map(
        query.Paginate(query.Match(query.Index('notificationsByUserId'), id), options),
        query.Lambda(
          ['ref'],
          query.Let(
            {
              data: query.Select(['data'], query.Get(query.Var('ref'))),
              actorId: query.Select(['actorId'], query.Var('data')),
              actor: query.Select(
                ['data'],
                query.Get(query.Ref(query.Collection('users'), query.Var('actorId')))
              )
            },
            query.Merge(query.Var('data'), {
              actor: {
                id: query.Var('actorId'),
                firstName: query.Select(['firstName'], query.Var('actor')),
                middleName: query.Select(['middleName'], query.Var('actor')),
                surname: query.Select(['surname'], query.Var('actor')),
                profilePicture: query.Select(['profilePicture'], query.Var('actor'), null)
              }
            })
          )
        )
      )
    );

    console.log(result);

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: normalizeData(result.data || []),
        nextToken: result.after ? result.after[0].id : null
      })
    };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
