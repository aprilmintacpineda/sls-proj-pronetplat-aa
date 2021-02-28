const { query } = require('faunadb');
const {
  initClient,
  getById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');

async function handler ({ authUser, params: { contactDetailId } }) {
  try {
    const faunadb = initClient();

    await faunadb.query(
      query.Let(
        {
          document: getById(contactDetailId)
        },
        query.If(
          query.Not(
            query.Equals(
              query.Select(
                ['data', 'userId'],
                query.Var('document')
              ),
              authUser.id
            )
          ),
          query.Abort('authUserDoesNotOwnDocument'),
          query.Delete(query.Select(['ref'], query.Var('document')))
        )
      )
    );
  } catch (error) {
    console.log('error');

    if (error.decription === 'authUserDoesNotOwnDocument')
      return { statusCode: 403 };

    return { statusCode: 500 };
  }

  return { statusCode: 200 };
}

module.exports.handler = httpGuard({
  handler,
  guards: [
    guardTypes.auth,
    guardTypes.deviceToken,
    guardTypes.setupComplete
  ]
});
