const { query } = require('faunadb');
const {
  initClient,
  getById,
  existsByIndex
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const { getPublicUserData } = require('dependencies/utils/users');

async function handler ({ params: { nextToken }, authUser }) {
  const faunadb = initClient();

  const result = await faunadb.query(
    query.Map(
      query.Paginate(
        query.Match(query.Index('inboxByUserId'), authUser.id),
        {
          size: 20,
          after: nextToken
            ? query.Ref(query.Collection('chatInboxes'), nextToken)
            : []
        }
      ),
      query.Lambda(
        ['updatedAt', 'ref'],
        query.Let(
          {
            inbox: query.Get(query.Var('ref')),
            userId: query.Select(
              ['data', 'userId'],
              query.Var('inbox')
            ),
            user: getById('users', query.Var('userId')),
            isConnected: existsByIndex(
              'contactByOwnerContact',
              authUser.id,
              query.Var('userId')
            )
          },
          query.Merge(query.Select(['data'], query.Var('inbox')), {
            user: query.Var('user'),
            isConnected: query.Var('isConnected')
          })
        )
      )
    )
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(inbox => ({
        ...inbox,
        user: getPublicUserData(inbox.user)
      })),
      nextToken: result.after?.[0].id || null
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
