const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');
const {
  checkRequiredHeaderValues
} = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const { invokeEvent } = require('dependencies/utils/lambda');
const {
  getUserPublicResponseData,
  hasCompletedSetup
} = require('dependencies/utils/users');

module.exports.handler = async ({
  headers,
  queryStringParameters
}) => {
  const headerValues = checkRequiredHeaderValues(headers);

  if (!headerValues) {
    console.log('Invalid header values');
    return { statusCode: 400 };
  }

  let authUser;

  try {
    const token = await jwt.verify(headerValues.authToken);
    authUser = token.data;
  } catch (_1) {
    console.log('Invalid token');
    return { statusCode: 401 };
  }

  if (!hasCompletedSetup(authUser)) {
    console.log('Not yet setup');
    return { statusCode: 403 };
  }

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
          query.Ref(query.Collection('users'), query.Var('actorId'))
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
};
