const { query } = require('faunadb');
const Notification = require('dependencies/nodejs/models/Notification');
const { initClient } = require('dependencies/nodejs/utils/faunadb');

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
  const client = initClient();

  await Promise.all(
    client.query(
      query.Call(
        'updateUserBadgeCount',
        authUser.id,
        'notificationsCount',
        -unseenNotificationIds.length
      )
    ),
    unseenNotificationIds.map(notificationId =>
      markAsSeen(notificationId)
    )
  );
};
