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
    const { data: authUser } = await jwt.verify(
      getAuthTokenFromHeaders(headers)
    );
    const client = initClient();
    const { nextToken: after } = queryStringParameters || {};

    const result = await client.query(
      query.Map(
        query.Paginate(
          query.Match(
            query.Index('notificationsByUserId'),
            authUser.id
          ),
          {
            size: 20,
            after: after
              ? query.Ref(query.Collection('notifications'), after)
              : []
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
              id: query.Select(['id'], query.Var('ref')),
              actor: getUserPublicResponseDataQuery(
                query.Var('actorId'),
                query.Var('actor')
              )
            })
          )
        )
      )
    );

    const unseenCount = result.data.reduce((count, current) => {
      if (current.seenAt) return count;
      return count + 1;
    }, 0);

    if (unseenCount) {
      await client.query(
        query.Call(
          'updateUserBadgeCount',
          'notificationsCount',
          -unseenCount
        )
      );
    }

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
