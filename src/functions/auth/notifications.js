const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const { invokeEvent } = require('dependencies/utils/lambda');
const { getPublicUserData } = require('dependencies/utils/users');

async function handler ({ params: { nextToken }, authUser }) {
  const faunadb = initClient();

  const result = await faunadb.query(
    query.Map(
      query.Paginate(
        query.Match(
          query.Index('notificationsByUserId'),
          authUser.id
        ),
        {
          size: 20,
          after: nextToken
            ? query.Ref(query.Collection('notifications'), nextToken)
            : []
        }
      ),
      query.Lambda(['createdAt', 'actorId', 'ref'], {
        notification: query.Get(query.Var('ref')),
        user: query.Get(
          query.Ref(query.Collection('users'), query.Var('actorId'))
        )
      })
    )
  );

  const unseenNotificationIds = [];
  const data = [];

  result.data.forEach(({ notification, user }) => {
    const notificationId = notification.ref.id;

    if (!notification.seenAt)
      unseenNotificationIds.push(notificationId);

    data.push({
      ...notification.data,
      id: notificationId,
      user: getPublicUserData(user)
    });
  });

  if (unseenNotificationIds.length) {
    await invokeEvent({
      functionName: process.env.fn_markNotificationsAsSeen,
      payload: {
        authUser,
        unseenNotificationIds
      }
    });
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      data,
      nextToken: result.after?.[0].id || null
    })
  };
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
