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
  sendWebSocketEvent
} = require('dependencies/utils/webSocket');

async function handler ({ authUser, params: { contactId } }) {
  const faunadb = initClient();

  await faunadb.query(
    query.Do(
      hardDeleteByIndex(
        'contactByOwnerContact',
        authUser.id,
        contactId
      ),
      hardDeleteByIndex(
        'contactByOwnerContact',
        contactId,
        authUser.id
      ),
      query.Call(
        'updateUserBadgeCount',
        authUser.id,
        'contactsCount',
        -1
      ),
      query.Call(
        'updateUserBadgeCount',
        contactId,
        'contactsCount',
        -1
      )
    )
  );

  await sendWebSocketEvent({
    type: 'userDisconected',
    authUser,
    userId: contactId
  });

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
