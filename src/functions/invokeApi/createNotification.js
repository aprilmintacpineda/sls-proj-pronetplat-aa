const { query } = require('faunadb');
const {
  initClient,
  create,
  getById
} = require('dependencies/utils/faunadb');
const {
  sendWebSocketEvent,
  sendPushNotification
} = require('dependencies/utils/invokeLambda');
const {
  getFullName,
  getPersonalPronoun
} = require('dependencies/utils/users');

module.exports = async ({
  authUser,
  userId,
  body,
  type,
  title,
  payload = null
}) => {
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

  // getters
  const getters = {};
  if (payload?.eventId)
    getters.event = getById('_events', payload.eventId);

  queries.push(getters);

  const faunadb = initClient();
  const values = await faunadb.query(query.Do(...queries));

  const fullname = getFullName(authUser);
  const webSocketEventPayload = {
    title: title.replace(/{fullname}/gim, fullname),
    body: body
      .replace(/{fullname}/gim, fullname)
      .replace(
        /{genderPossessiveLowercase}/gim,
        getPersonalPronoun(authUser).possessive.lowercase
      )
  };

  Object.keys(values).forEach(key => {
    const value = values[key];

    webSocketEventPayload[key] = {
      ...value.data,
      id: value.ref.id
    };
  });

  await Promise.all([
    sendPushNotification({
      userId,
      authUser,
      title,
      body
    }),
    sendWebSocketEvent({
      type: 'notification',
      trigger: type,
      authUser,
      userId,
      payload: webSocketEventPayload
    })
  ]);
};
