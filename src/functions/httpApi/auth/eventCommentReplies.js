const { query } = require('faunadb');
const {
  initClient,
  getById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const { getPublicUserData } = require('dependencies/utils/users');

async function handler ({ params: { commentId, nextToken } }) {
  const faunadb = initClient();
  let result = null;
  const nextTokenParts = nextToken ? nextToken.split('___') : null;

  try {
    result = await faunadb.query(
      query.Map(
        query.Paginate(
          query.Match(
            query.Index('repliesByEventComment'),
            commentId,
            false
          ),
          {
            size: 20,
            after: nextTokenParts
              ? [
                  nextTokenParts[0],
                  query.Ref(
                    query.Collection('eventComments'),
                    nextTokenParts[1]
                  )
                ]
              : []
          }
        ),
        query.Lambda(
          ['createdAt', 'ref'],
          query.Let(
            {
              comment: query.Get(query.Var('ref'))
            },
            {
              comment: query.Var('comment'),
              user: getById(
                'users',
                query.Select(
                  ['data', 'userId'],
                  query.Var('comment')
                )
              )
            }
          )
        )
      )
    );
  } catch (error) {
    console.log('error', error);

    if (error.description === 'ValidationError')
      return { statusCode: 400 };

    return { statusCode: 500 };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(({ comment, user }) => ({
        id: comment.ref.id,
        ...comment.data,
        user: getPublicUserData(user)
      })),
      nextToken: result.after
        ? `${result.after[0]}___${result.after[1].id}`
        : null
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
