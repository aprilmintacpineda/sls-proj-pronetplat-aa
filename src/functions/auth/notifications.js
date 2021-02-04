const { query } = require('faunadb');
const { initClient } = require('dependencies/nodejs/utils/faunadb');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const {
  getUserPublicResponseData,
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
          ['ref', 'actorId', 'createdAt'],
          query.Let(
            {
              data: query.Select(
                ['data'],
                query.Get(query.Var('ref'))
              ),
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
            {
              notification: query.Var('data'),
              actor: query.Var('actor')
            }
          )
        )
      )
    );

    let unseenCount = 0;
    const data = [];

    result.data.forEach(({ notification, actor }) => {
      if (!notification.seenAt) unseenCount++;

      data.push({
        ...notification,
        actor: {
          ...getUserPublicResponseData(actor),
          id: notification.actorId
        }
      });
    });

    if (unseenCount) {
      await client.query(
        query.Call(
          'updateUserBadgeCount',
          authUser.id,
          'notificationsCount',
          -unseenCount
        )
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        data,
        nextToken: result.after?.[0].id || null
      })
    };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
