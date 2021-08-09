const { query } = require('faunadb');
const {
  initClient,
  hardDeleteByIndex
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
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

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete],
  formValidator: ({ contactId }) => validate(contactId, ['required'])
});
