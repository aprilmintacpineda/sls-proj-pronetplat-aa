const { query } = require('faunadb');
const { initClient } = require('dependencies/nodejs/utils/faunadb');
const {
  checkRequiredHeaderValues
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const { invokeEvent } = require('dependencies/nodejs/utils/lambda');
const {
  getUserPublicResponseData,
  throwIfNotCompletedSetup
} = require('dependencies/nodejs/utils/users');

module.exports.handler = async ({
  headers,
  queryStringParameters
}) => {
  try {
    const { authToken } = checkRequiredHeaderValues(headers);
    const { data: authUser } = await jwt.verify(authToken);

    throwIfNotCompletedSetup(authUser);

    const client = initClient();
    const { nextToken: after } = queryStringParameters || {};

    const result = await client.query(
      query.Map(
        query.Paginate(
          query.Match(
            query.Index('notificationsByUserId'),
            authUser.id
          ),
          {
            size: 20,
            after: after
              ? query.Ref(query.Collection('notifications'), after)
              : []
          }
        ),
        query.Lambda(['createdAt', 'actorId', 'ref'], {
          notification: query.Get(query.Var('ref')),
          actor: query.Get(
            query.Ref(
              query.Collection('users'),
              query.Var('actorId')
            )
          )
        })
      )
    );

    const unseenNotificationIds = [];
    const data = [];

    result.data.forEach(({ notification, actor }) => {
      const notificationId = notification.ref.id;

      if (!notification.seenAt)
        unseenNotificationIds.push(notificationId);

      data.push({
        ...notification.data,
        id: notificationId,
        actor: {
          ...getUserPublicResponseData(actor.data),
          id: actor.ref.id
        }
      });
    });

    if (unseenNotificationIds.length) {
      await invokeEvent({
        functionName: process.env.fn_markNotificationsAsSeen,
        payload: {
          authUser,
          unseenNotificationIds
        }
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        data,
        nextToken: result.after?.[0].id || null
      })
    };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
