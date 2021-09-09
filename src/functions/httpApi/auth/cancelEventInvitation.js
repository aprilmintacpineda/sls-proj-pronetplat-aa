const { query } = require('faunadb');
const {
  initClient,
  updateByIndex
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  createNotification
} = require('dependencies/utils/invokeLambda');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, params: { eventId }, formBody }) {
  const faunadb = initClient();

  const eventInvitation = await faunadb.query(
    query.Let(
      {
        eventInvitation: updateByIndex({
          index: 'eventInvitationByUserInviterEvent',
          args: [
            formBody.contactId,
            authUser.id,
            eventId,
            'pending'
          ],
          data: {
            status: 'cancelled'
          }
        })
      },
      query.Do(
        query.Call(
          'updateUserBadgeCount',
          formBody.contactId,
          'eventInvitationsCount',
          -1
        ),
        query.Var('eventInvitation')
      )
    )
  );

  await createNotification({
    authUser,
    recipientId: formBody.contactId,
    body: '{fullname} has cancelled {genderPossessiveLowercase} event invitation for {eventName}.',
    title: 'Event invitation cancelled',
    type: 'eventInvitationCancelled',
    payload: {
      eventId,
      eventInvitationId: eventInvitation.ref.id
    }
  });

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete],
  formValidator: ({ contactId }) => validate(contactId, ['required'])
});
