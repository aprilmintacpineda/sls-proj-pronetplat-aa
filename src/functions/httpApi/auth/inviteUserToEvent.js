const { query } = require('faunadb');
const {
  initClient,
  existsByIndex,
  create
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  sendPushNotification,
  sendWebSocketEvent
} = require('dependencies/utils/invokeLambda');
const { getFullName } = require('dependencies/utils/users');
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
          )
          // @todo check that the user ig not going to the event
          // @todo check that event is not full yet
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
      userId: formBody.contactId,
      title: 'Event invitation',
      body: '{fullname} invited you to join an event.',
      authUser
    }),
    sendWebSocketEvent({
      type: 'notification',
      trigger: 'eventInvitation',
      authUser,
      userId: formBody.contactId,
      payload: {
        body: `${getFullName(
          authUser
        )} invited you to join an event.`,
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
