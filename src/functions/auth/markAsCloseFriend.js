const {
  initClient,
  updateIfOwnedByUser,
  getById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');

async function handler ({ authUser, params: { contactsId } }) {
  try {
    const fauna = initClient();

    await fauna.query(
      updateIfOwnedByUser(
        authUser.id,
        getById('contacts', contactsId),
        { isCloseFriend: true }
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
