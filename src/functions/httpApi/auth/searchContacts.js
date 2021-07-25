const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const { getPublicUserData } = require('dependencies/utils/users');

async function handler ({ authUser, params: { search, nextToken } }) {
  if (!search) {
    return {
      statusCode: 200,
      body: JSON.stringify({ data: [] })
    };
  }

  const fauna = initClient();

  const result = await fauna.query(
    query.Map(
      query.Paginate(
        query.Intersection(
          query.Map(
            query.NGram(search.toLowerCase(), 2, 3),
            query.Lambda(
              ['needle'],
              query.Match(
                query.Index('searchContactsByName'),
                authUser.id,
                query.Var('needle')
              )
            )
          )
        ),
        {
          size: 20,
          after: nextToken
            ? query.Ref(query.Collection('users'), nextToken)
            : []
        }
      ),
      query.Lambda(['ref'], query.Get(query.Var('ref')))
    )
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(user => ({
        ...getPublicUserData(user),
        isConnected: true
      })),
      nextToken: result.after?.[0].id || null
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
