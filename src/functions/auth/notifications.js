const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const { invokeEvent } = require('dependencies/utils/lambda');
const { getPublicUserData } = require('dependencies/utils/users');

async function handler ({ nextToken, authUser }) {
  const client = initClient();

  const result = await client.query(
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
        actor: query.Get(
          query.Ref(query.Collection('users'), query.Var('actorId'))
        )
      })
    )
  );

  const unseenNotificationIds = [];
  const data = [];

  result.data.forEach(({ notification, actor }) => {
    const notificationId = notification.ref.id;

    if (!notification.seenAt)
      unseenNotificationIds.push(notificationId);

    data.push({
      ...notification.data,
      id: notificationId,
      actor: getPublicUserData(actor)
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
  guards: [
    guardTypes.auth,
    guardTypes.deviceToken,
    guardTypes.setupComplete
  ]
});
