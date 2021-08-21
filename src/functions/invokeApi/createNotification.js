const { query } = require('faunadb');
const { create, initClient } = require('dependencies/utils/faunadb');
const {
  sendWebSocketEvent,
  sendPushNotification
} = require('dependencies/utils/invokeLambda');

module.exports = async ({
  authUser,
  recipientId,
  body,
  type,
  title,
  payload = null
}) => {
  if (recipientId === authUser.id) {
    console.log('invalid: trying to send notification to self.');
    return;
  }

  const faunadb = initClient();
  const queries = [
    create('notifications', {
      userId: recipientId,
      type,
      body,
      actorId: authUser.id,
      payload
    }),
    query.Call(
      'updateUserBadgeCount',
      recipientId,
      'notificationsCount',
      1
    )
  ];

  if (type === 'contactRequestCancelled') {
    queries.push(
      query.Call(
        'updateUserBadgeCount',
        recipientId,
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
      recipientId,
      authUser,
      title,
      body,
      payload
    }),
    sendWebSocketEvent({
      type: 'notification',
      trigger: type,
      authUser,
      recipientId,
      payload: {
        title,
        body,
        ...payload
      }
    })
  ]);
};
