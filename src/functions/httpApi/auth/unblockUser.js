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
} = require('dependencies/utils/invokeLambda');

async function handler ({ authUser, params: { contactId } }) {
  const faunadb = initClient();

  await faunadb.query(
    hardDeleteByIndex(
      'userBlockingsByBlockerIdUserId',
      authUser.id,
      contactId
    )
  );

  await sendWebSocketEvent({
    type: 'unblockedByUser',
    authUser,
    recipientId: contactId
  });

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
