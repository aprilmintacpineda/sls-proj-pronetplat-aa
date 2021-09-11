const {
  initClient,
  updateByIndex
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');

async function handler ({ authUser, params: { contactId } }) {
  const faunadb = initClient();

  try {
    await faunadb.query(
      updateByIndex({
        index: 'contactByOwnerContact',
        args: [authUser.id, contactId],
        data: { isCloseFriend: true }
      })
    );
  } catch (error) {
    console.log('error', error);

    if (error.description === 'authUserDoesNotOwnDocument')
      return { statusCode: 404 };

    return { statusCode: 500 };
  }

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
