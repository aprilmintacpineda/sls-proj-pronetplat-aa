const { query } = require('faunadb');
const {
  initClient,
  getById,
  existsByIndex
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const { invokeEvent } = require('dependencies/utils/invokeLambda');
const { getPublicUserData } = require('dependencies/utils/users');

async function handler ({ params: { nextToken }, authUser }) {
  const faunadb = initClient();
  const nextTokenParts = nextToken ? nextToken.split('___') : null;

  const result = await faunadb.query(
    query.Map(
      query.Paginate(
        query.Match(
          query.Index('notificationsByUserId'),
          authUser.id
        ),
        {
          size: 20,
          after: nextTokenParts
            ? [
                nextTokenParts[0],
                nextTokenParts[1],
                query.Ref(
                  query.Collection('notifications'),
                  nextTokenParts[2]
                )
              ]
            : []
        }
      ),
      query.Lambda(
        ['createdAt', 'actorId', 'ref'],
        query.Let(
          {
            notification: query.Get(query.Var('ref')),
            eventId: query.Select(
              ['data', 'payload', 'eventId'],
              query.Var('notification'),
              null
            ),
            userId: query.Select(
              ['data', 'payload', 'userId'],
              query.Var('notification'),
              null
            ),
            eventInvitationId: query.Select(
              ['data', 'payload', 'eventInvitationId'],
              query.Var('notification'),
              null
            )
          },
          {
            notification: query.Var('notification'),
            payload: {
              event: query.If(
                query.IsNull(query.Var('eventId')),
                null,
                getById('_events', query.Var('eventId'))
              ),
              user: query.If(
                query.IsNull(query.Var('userId')),
                null,
                getById('users', query.Var('userId'))
              ),
              eventInvitation: query.If(
                query.IsNull(query.Var('eventInvitationId')),
                null,
                getById(
                  'eventInvitations',
                  query.Var('eventInvitationId')
                )
              )
            },
            actor: getById('users', query.Var('actorId')),
            isOrganizer: query.If(
              query.IsNull(query.Var('eventId')),
              null,
              existsByIndex(
                'eventOrganizerByOrganizerEvent',
                authUser.id,
                query.Var('eventId')
              )
            ),
            isGoing: query.If(
              query.IsNull(query.Var('eventId')),
              null,
              existsByIndex(
                'eventAttendeeByUserEventStatus',
                authUser.id,
                query.Var('eventId'),
                'active'
              )
            )
          }
        )
      )
    )
  );

  const unseenNotificationIds = [];
  const data = result.data.map(
    ({
      notification: _notification,
      actor,
      isOrganizer,
      isGoing,
      payload = {}
    }) => {
      const notification = {
        ..._notification.data,
        id: _notification.ref.id,
        payload: {
          ...payload,
          event: payload.event
            ? {
                id: payload.event.ref.id,
                ...payload.event.data,
                isOrganizer,
                isGoing
              }
            : null,
          user: payload.user
            ? getPublicUserData(payload.user)
            : null,
          eventInvitation: payload.eventInvitation
            ? {
                ...payload.eventInvitation.data,
                id: payload.eventInvitation.ref.id
              }
            : null
        },
        actor: getPublicUserData(actor)
      };

      if (!notification.seenAt)
        unseenNotificationIds.push(notification.id);

      return notification;
    }
  );

  if (unseenNotificationIds.length) {
    await invokeEvent({
      eventName: 'markNotificationsAsSeen',
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
      nextToken: result.after
        ? `${result.after[0]}___${result.after[1]}___${result.after[2].id}`
        : null
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
