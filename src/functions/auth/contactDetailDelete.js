const {
  initClient,
  getById,
  hardDeleteIfOwnedByUser
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');

async function handler ({ authUser, params: { contactDetailId } }) {
  try {
    const faunadb = initClient();

    await faunadb.query(
      hardDeleteIfOwnedByUser(
        authUser.id,
        getById('contactDetails', contactDetailId)
      )
    );

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);

    if (error.decription === 'authUserDoesNotOwnDocument')
      return { statusCode: 404 };

    return { statusCode: 500 };
  }
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
