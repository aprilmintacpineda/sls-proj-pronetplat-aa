const { query } = require('faunadb');
const {
  initClient,
  hardDeleteByIndex
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

  await faunadb.query(
    query.Do(
      hardDeleteByIndex(
        'eventInvitationByUserInviterEvent',
        formBody.contactId,
        authUser.id,
        eventId
      ),
      query.Call(
        'updateUserBadgeCount',
        formBody.contactId,
        'eventInvitationsCount',
        -1
      )
    )
  );

  await createNotification({
    authUser,
    userId: formBody.contactId,
    body: '{fullname} has cancelled {genderPossessiveLowercase} event invitation.',
    title: 'Event invitation cancelled',
    type: 'eventInvitationCancelled'
  });

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete],
  formValidator: ({ contactId }) => validate(contactId, ['required'])
});
