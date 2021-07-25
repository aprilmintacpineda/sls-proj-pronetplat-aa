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

async function handler ({
  params: { nextToken, eventId },
  authUser
}) {
  const faunadb = initClient();

  const result = await faunadb.query(
    query.Map(
      query.Paginate(
        query.Match(query.Index('eventOrganizersByEvent'), eventId),
        {
          size: 20,
          after: nextToken
            ? query.Ref(
                query.Collection('eventOrganizersByEvent'),
                nextToken
              )
            : []
        }
      ),
      query.Lambda(['userId', 'ref'], {
        user: getById('users', query.Var('userId')),
        isConnected: query.If(
          query.Equals(query.Var('userId'), authUser.id),
          false,
          existsByIndex(
            'contactByOwnerContact',
            authUser.id,
            query.Var('userId')
          )
        )
      })
    )
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(({ user, isConnected }) => ({
        ...getPublicUserData(user),
        isConnected
      })),
      nextToken: result.after?.[0].id || null
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
