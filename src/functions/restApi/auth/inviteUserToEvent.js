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

  try {
    await faunadb.query(
      query.If(
        query.And(
          existsByIndex(
            'contactByOwnerContact',
            formBody.contactId,
            authUser.id
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
              'eventInvitationByUserEvent',
              formBody.contactId,
              eventId
            )
          ),
          query.Not(
            existsByIndex(
              'eventAttendeeByUserEvent',
              formBody.contactId,
              eventId
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
              )
            )
          )
        ),
        query.Do(
          create('eventInvitations', {
            eventId,
            userId: formBody.contactId,
            inviterId: authUser.id
          }),
          query.Call(
            'updateUserBadgeCount',
            formBody.contactId,
            'eventInvitationsCount',
            1
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
      title: 'Event invitation',
      body: '{fullname} invited you to join {eventName}.',
      authUser
    }),
    sendWebSocketEvent({
      type: 'notification',
      trigger: 'eventInvitation',
      authUser,
      recipientId: formBody.contactId,
      payload: {
        body: '{fullname} invited you to join {eventName}.',
        title: 'Event invitation'
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
