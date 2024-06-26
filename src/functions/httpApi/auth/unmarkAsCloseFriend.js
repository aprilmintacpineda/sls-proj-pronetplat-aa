const {
  initClient,
  updateByIndex
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');

async function handler ({ authUser, params: { contactId } }) {
  try {
    const faunadb = initClient();

    await faunadb.query(
      updateByIndex({
        index: 'contactByOwnerContact',
        args: [authUser.id, contactId],
        data: { isCloseFriend: false }
      })
    );

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);

    if (error.description === 'authUserDoesNotOwnDocument')
      return { statusCode: 404 };

    return { statusCode: 500 };
  }
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
