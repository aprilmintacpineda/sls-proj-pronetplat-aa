const { query } = require('faunadb');
const {
  initClient,
  getById,
  ifOwnedByUser,
  softDeleteById,
  updateById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');

async function handler ({ authUser, params: { commentId } }) {
  const faunadb = initClient();

  try {
    await faunadb.query(
      ifOwnedByUser(
        authUser.id,
        getById('eventComments', commentId),
        query.Let(
          {
            replyToCommentId: query.Select(
              ['data', 'commentId'],
              query.Var('document'),
              null
            )
          },
          query.Do(
            softDeleteById('eventComments', commentId),
            query.If(
              query.Not(query.IsNull(query.Var('replyToCommentId'))),
              updateById(
                'eventComments',
                query.Var('replyToCommentId'),
                {
                  numReplies: query.Subtract(
                    query.Select(
                      ['data', 'numReplies'],
                      getById(
                        'eventComments',
                        query.Var('replyToCommentId')
                      )
                    ),
                    1
                  )
                }
              ),
              null
            )
          )
        )
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
