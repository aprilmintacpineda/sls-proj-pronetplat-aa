const { query } = require('faunadb');
const Notification = require('dependencies/nodejs/models/Notification');
const { initClient } = require('dependencies/nodejs/utils/faunadb');
const {
  sendPushNotification
} = require('dependencies/nodejs/utils/notifications');

module.exports.handler = async ({
  authUser,
  userId,
  body,
  type,
  title,
  category,
  data
}) => {
  try {
    const promises = [
      new Notification().create({
        userId,
        type,
        body,
        actorId: authUser.id
      })
    ];

    if (
      type === 'contactRequestAccepted' ||
      type === 'contactRequestCancelled' ||
      type === 'contactRequestDeclined'
    ) {
      const client = initClient();

      promises.push(
        client.query(
          query.Call(
            'updateUserBadgeCount',
            authUser.id,
            'receivedContactRequestsCount',
            -1
          )
        )
      );
    }

    await Promise.all(promises);

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
  } catch (error) {
    console.log('error', error);
  }
};
