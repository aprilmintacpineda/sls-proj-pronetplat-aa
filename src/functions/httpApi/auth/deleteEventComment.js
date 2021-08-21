const {
  initClient,
  softDeleteByIdIfOwnedByUser,
  getById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');

async function handler ({ authUser, params: { commentId } }) {
  const faunadb = initClient();

  try {
    await faunadb.query(
      softDeleteByIdIfOwnedByUser(
        authUser.id,
        getById('users', commentId)
      )
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
