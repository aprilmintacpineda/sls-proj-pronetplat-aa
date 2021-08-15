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
  const nextTokenParts = nextToken ? nextToken.split('___') : null;

  const result = await faunadb.query(
    query.Map(
      query.Paginate(
        query.Match(query.Index('eventOrganizersByEvent'), eventId),
        {
          size: 1,
          after: nextTokenParts
            ? [
                nextTokenParts[0],
                query.Ref(
                  query.Collection('eventOrganizers'),
                  nextTokenParts[1]
                )
              ]
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
