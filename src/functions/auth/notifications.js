const { query } = require('faunadb');
const jwt = require('/opt/nodejs/utils/jwt');
const {
  getAuthTokenFromHeaders
} = require('/opt/nodejs/utils/helpers');
const { initClient } = require('/opt/nodejs/utils/faunadb');

module.exports.handler = async ({
  headers,
  queryStringParameters
}) => {
  try {
    const {
      data: { id }
    } = await jwt.verify(getAuthTokenFromHeaders(headers));
    const client = initClient();
    const { nextToken: after } = queryStringParameters || {};

    const result = await client.query(
      query.Map(
        query.Paginate(
          query.Match(query.Index('notificationsByUserId'), id),
          {
            size: 20,
            after: after
              ? query.Ref(query.Collection('notifications'), after)
              : 0
          }
        ),
        query.Lambda(
          ['createdAt', 'ref'],
          query.Let(
            {
              data: query.Select(
                ['data'],
                query.Get(query.Var('ref'))
              ),
              actorId: query.Select(['actorId'], query.Var('data')),
              actor: query.Select(
                ['data'],
                query.Get(
                  query.Ref(
                    query.Collection('users'),
                    query.Var('actorId')
                  )
                )
              ),
              markedAsSeen: query.If(
                query.Not(
                  query.ContainsField('seenAt', query.Var('data'))
                ),
                query.Update(query.Var('ref'), {
                  data: {
                    seenAt: query.Format('%t', query.Now())
                  }
                }),
                null
              )
            },
            query.Merge(query.Var('data'), {
              actor: {
                id: query.Var('actorId'),
                firstName: query.Select(
                  ['firstName'],
                  query.Var('actor')
                ),
                middleName: query.Select(
                  ['middleName'],
                  query.Var('actor')
                ),
                surname: query.Select(
                  ['surname'],
                  query.Var('actor')
                ),
                profilePicture: query.Select(
                  ['profilePicture'],
                  query.Var('actor'),
                  null
                ),
                company: query.Select(
                  ['company'],
                  query.Var('actor'),
                  null
                ),
                bio: query.Select(['bio'], query.Var('actor'), null),
                jobTitle: query.Select(
                  ['jobTitle'],
                  query.Var('actor'),
                  null
                )
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
