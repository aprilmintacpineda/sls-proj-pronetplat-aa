const { query } = require('faunadb');
const { initClient, create } = require('dependencies/utils/faunadb');
const {
  sendPushNotification
} = require('dependencies/utils/notifications');

module.exports.handler = async ({
  authUser,
  userId,
  body,
  type,
  title,
  category,
  data
}) => {
  const queries = [
    create('notifications', {
      userId,
      type,
      body,
      actorId: authUser.id
    }),
    query.Call(
      'updateUserBadgeCount',
      userId,
      'notificationsCount',
      1
    )
  ];

  if (type === 'contactRequestCancelled') {
    queries.push(
      query.Call(
        'updateUserBadgeCount',
        userId,
        'receivedContactRequestsCount',
        -1
      )
    );
  } else if (
    type === 'contactRequestAccepted' ||
    type === 'contactRequestDeclined'
  ) {
    queries.push(
      query.Call(
        'updateUserBadgeCount',
        authUser.id,
        'receivedContactRequestsCount',
        -1
      )
    );
  }

  const client = initClient();
  await client.query(query.Do(...queries));

  await sendPushNotification({
    userId,
    authUser,
    title,
    body,
    data: {
      ...data,
      type,
      category
    }
  });
};
