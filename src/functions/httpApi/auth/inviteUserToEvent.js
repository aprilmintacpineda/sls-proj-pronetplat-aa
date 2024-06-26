const { query } = require('faunadb');
const {
  initClient,
  existsByIndex,
  create,
  getById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  sendPushNotification,
  sendWebSocketEvent
} = require('dependencies/utils/invokeLambda');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, params: { eventId }, formBody }) {
  if (formBody.contactId === authUser.id) return { statusCode: 400 };

  const faunadb = initClient();
  let eventInvitation = null;

  try {
    eventInvitation = await faunadb.query(
      query.If(
        query.And(
          existsByIndex(
            'contactByOwnerContact',
            authUser.id,
            formBody.contactId
          ),
          query.Not(
            existsByIndex(
              'eventOrganizerByOrganizerEvent',
              formBody.contactId,
              eventId
            )
          ),
          query.Not(
            existsByIndex(
              'eventAttendeeByUserEventStatus',
              formBody.contactId,
              eventId,
              'active'
            )
          ),
          query.Not(
            existsByIndex(
              'eventInvitationByUserInviterEventStatus',
              formBody.contactId,
              authUser.id,
              eventId,
              'pending'
            )
          ),
          query.Let(
            {
              _event: getById('_events', eventId)
            },
            query.And(
              query.GT(
                query.Time(
                  query.Select(
                    ['data', 'startDateTime'],
                    query.Var('_event')
                  )
                ),
                query.Now()
              ),
              query.Equals(
                query.Select(
                  ['data', 'status'],
                  query.Var('_event')
                ),
                'published'
              ),
              query.LT(
                query.Select(
                  ['data', 'numGoing'],
                  query.Var('_event')
                ),
                query.Select(
                  ['data', 'maxAttendees'],
                  query.Var('_event')
                )
              ),
              query.Or(
                query.Equals(
                  query.Select(
                    ['data', 'visibility'],
                    query.Var('_event')
                  ),
                  'public'
                ),
                existsByIndex(
                  'eventOrganizerByOrganizerEvent',
                  authUser.id,
                  eventId
                ),
                existsByIndex(
                  'eventAttendeeByUserEventStatus',
                  authUser.id,
                  eventId,
                  'active'
                )
              )
            )
          )
        ),
        query.Let(
          {
            eventInvitation: create('eventInvitations', {
              eventId,
              userId: formBody.contactId,
              inviterId: authUser.id,
              status: 'pending'
            })
          },
          query.Do(
            query.Call(
              'updateUserBadgeCount',
              formBody.contactId,
              'eventInvitationsCount',
              1
            ),
            query.Var('eventInvitation')
          )
        ),
        query.Abort('CheckFailed')
      )
    );
  } catch (error) {
    console.log(error);

    if (error.description === 'CheckFailed')
      return { statusCode: 400 };

    return { statusCode: 500 };
  }

  await Promise.all([
    sendPushNotification({
      recipientId: formBody.contactId,
      authUser,
      payload: {
        title: 'Event invitation',
        body: '{fullname} invited you to join {eventName}.',
        eventId
      }
    }),
    sendWebSocketEvent({
      type: 'notification',
      trigger: 'eventInvitation',
      authUser,
      recipientId: formBody.contactId,
      payload: {
        body: '{fullname} invited you to join {eventName}.',
        title: 'Event invitation',
        eventId,
        eventInvitationId: eventInvitation.ref.id
      }
    })
  ]);

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete],
  formValidator: ({ contactId }) => validate(contactId, ['required'])
});
