const { query } = require('faunadb');
const Notification = require('dependencies/nodejs/models/Notification');

function markAsSeen (notificationId) {
  const notification = new Notification();

  return notification.updateById(notificationId, {
    seenAt: query.Format('%t', query.Now())
  });
}

module.exports.handler = async notificationIds => {
  await Promise.all(
    notificationIds.map(notificationId => markAsSeen(notificationId))
  );
};
