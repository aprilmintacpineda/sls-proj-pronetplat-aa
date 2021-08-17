const { query } = require('faunadb');
const { create, initClient } = require('dependencies/utils/faunadb');
const {
  sendWebSocketEvent,
  sendPushNotification
} = require('dependencies/utils/invokeLambda');

module.exports = async ({
  authUser,
  userId,
  body,
  type,
  title,
  payload = null
}) => {
  if (userId === authUser.id) {
    console.log('invalid: trying to send notification to self.');
    return;
  }

  const faunadb = initClient();
  const queries = [
    create('notifications', {
      userId,
      type,
      body,
      actorId: authUser.id,
      payload
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

  await faunadb.query(query.Do(...queries));

  await Promise.all([
    sendPushNotification({
      userId,
      authUser,
      title,
      body,
      payload
    }),
    sendWebSocketEvent({
      type: 'notification',
      trigger: type,
      authUser,
      userId,
      payload: {
        title,
        body,
        ...payload
      }
    })
  ]);
};
