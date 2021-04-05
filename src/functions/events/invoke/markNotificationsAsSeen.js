const { query } = require('faunadb');
const { initClient, update } = require('dependencies/utils/faunadb');

module.exports.handler = async ({
  authUser,
  unseenNotificationIds
}) => {
  const client = initClient();

  await client.query(
    unseenNotificationIds
      .map(notificationId => {
        return update(
          query.Ref(
            query.Collection('notifications'),
            notificationId
          ),
          {
            seenAt: query.Format('%t', query.Now())
          }
        );
      })
      .concat(
        query.Call(
          'updateUserBadgeCount',
          authUser.id,
          'notificationsCount',
          -unseenNotificationIds.length
        )
      )
  );
};
