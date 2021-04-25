const {
  initClient,
  updateIfOwnedByUser,
  getByIndex
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');

async function handler ({ authUser, params: { contactId } }) {
  try {
    const fauna = initClient();

    await fauna.query(
      updateIfOwnedByUser(
        authUser.id,
        getByIndex('contactByOwnerContact', authUser.id, contactId),
        {
          isCloseFriend: true
        }
      )
    );

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);

    if (error.description === 'authUserDoesNotOwnDocument')
      return { statusCode: 404 };

    return { statusCode: 500 };
  }
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
