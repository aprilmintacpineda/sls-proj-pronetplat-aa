const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');

module.exports.handler = async ({
  authUser,
  unseenNotificationIds
}) => {
  const client = initClient();

  await client.query(
    unseenNotificationIds
      .map(notificationId => {
        return query.Update(
          query.Ref(
            query.Collection('notifications'),
            notificationId
          ),
          {
            data: {
              seenAt: query.Format('%t', query.Now())
            }
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
