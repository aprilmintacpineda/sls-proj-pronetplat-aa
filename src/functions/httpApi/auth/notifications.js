const { query } = require('faunadb');
const {
  initClient,
  getById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const { invokeEvent } = require('dependencies/utils/invokeLambda');
const { getPublicUserData } = require('dependencies/utils/users');

async function handler ({ params: { nextToken }, authUser }) {
  const faunadb = initClient();
  const nextTokenParts = nextToken ? nextToken.split('___') : null;

  const result = await faunadb.query(
    query.Map(
      query.Paginate(
        query.Match(
          query.Index('notificationsByUserId'),
          authUser.id
        ),
        {
          size: 5,
          after: nextTokenParts
            ? [
                nextTokenParts[0],
                nextTokenParts[1],
                query.Ref(
                  query.Collection('notifications'),
                  nextTokenParts[2]
                )
              ]
            : []
        }
      ),
      query.Lambda(
        ['createdAt', 'actorId', 'ref'],
        query.Let(
          {
            notification: query.Get(query.Var('ref')),
            eventId: query.Select(
              ['data', 'payload', 'eventId'],
              query.Var('notification'),
              null
            )
          },
          {
            notification: query.Var('notification'),
            user: getById('users', query.Var('actorId')),
            event: query.If(
              query.IsNull(query.Var('eventId')),
              null,
              getById('_events', query.Var('eventId'))
            )
          }
        )
      )
    )
  );

  const unseenNotificationIds = [];
  const data = [];

  result.data.forEach(
    ({ notification: _notification, user, event }) => {
      const notification = {
        ..._notification.data,
        id: _notification.ref.id,
        user: getPublicUserData(user)
      };

      if (event) {
        notification.event = {
          id: event.ref.id,
          ...event.data
        };
      }

      if (!notification.seenAt)
        unseenNotificationIds.push(notification.id);

      data.push(notification);
    }
  );

  if (unseenNotificationIds.length) {
    await invokeEvent({
      eventName: 'markNotificationsAsSeen',
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
      nextToken: result.after
        ? `${result.after[0]}___${result.after[1]}___${result.after[2].id}`
        : null
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
