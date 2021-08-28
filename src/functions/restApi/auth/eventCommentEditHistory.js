const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');

async function handler ({ params: { commentId, nextToken } }) {
  const faunadb = initClient();
  let result = null;
  const nextTokenParts = nextToken ? nextToken.split('___') : null;

  try {
    result = await faunadb.query(
      query.Map(
        query.Paginate(
          query.Match(
            query.Index('editHistoriesByCollectionId'),
            'eventComments',
            commentId
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
          query.Get(query.Var('ref'))
        )
      )
    );
  } catch (error) {
    console.log('error', error);
    return { statusCode: 500 };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(editHistory => ({
        id: editHistory.ref.id,
        ...editHistory.data
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
