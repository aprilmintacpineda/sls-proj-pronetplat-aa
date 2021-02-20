const { query } = require('faunadb');
const Notification = require('dependencies/models/Notification');
const { initClient } = require('dependencies/utils/faunadb');

function markAsSeen (notificationId) {
  const notification = new Notification();

  return notification.updateById(notificationId, {
    seenAt: query.Format('%t', query.Now())
  });
}

module.exports.handler = async ({
  authUser,
  unseenNotificationIds
}) => {
  try {
    const client = initClient();

    const promises = unseenNotificationIds.map(notificationId =>
      markAsSeen(notificationId)
    );

    promises.push(
      client.query(
        query.Call(
          'updateUserBadgeCount',
          authUser.id,
          'notificationsCount',
          -unseenNotificationIds.length
        )
      )
    );

    await Promise.all(promises);
  } catch (error) {
    console.log('error', error);
  }
};
