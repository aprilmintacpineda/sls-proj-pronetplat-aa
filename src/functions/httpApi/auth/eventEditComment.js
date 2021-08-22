const { query } = require('faunadb');
const {
  initClient,
  getById,
  create,
  ifOwnedByUser,
  updateById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const validate = require('dependencies/utils/validate');

async function handler ({
  authUser,
  formBody,
  params: { commentId }
}) {
  const faunadb = initClient();

  try {
    await faunadb.query(
      ifOwnedByUser(
        authUser.id,
        getById('eventComments', commentId),
        query.Do(
          updateById('eventComments', commentId, {
            comment: formBody.comment,
            wasEdited: true
          }),
          create('editHistories', {
            targetCollection: 'eventComments',
            targetId: commentId,
            data: {
              comment: query.Select(
                ['data', 'comment'],
                query.Var('document')
              )
            }
          })
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
  formValidator: ({ comment }) =>
    validate(comment, ['required', 'maxLength:3000']),
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
