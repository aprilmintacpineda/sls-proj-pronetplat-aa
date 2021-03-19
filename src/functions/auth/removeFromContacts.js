const { query } = require('faunadb');
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
    query.Do(
      hardDeleteByIndex(
        'contactByOwnerContact',
        authUser.id,
        contactId
      ),
      query.Call(
        'updateUserBadgeCount',
        authUser.id,
        'contactsCount',
        -1
      )
    )
  );

  return { statusCode: 200 };
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
