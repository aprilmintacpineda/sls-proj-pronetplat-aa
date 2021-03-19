const {
  initClient,
  hardDeleteByIndex
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');

async function handler ({ authUser, params: { contactId } }) {
  const faunadb = initClient();

  await faunadb.query(
    hardDeleteByIndex(
      'userBlockingsByBlockerIdUserId',
      authUser.id,
      contactId
    )
  );

  return { statusCode: 200 };
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
