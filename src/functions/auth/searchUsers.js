const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const { getPublicUserData } = require('dependencies/utils/users');

async function handler ({ params: { search, nextToken } }) {
  if (!search) return { statusCode: 400 };

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
                query.Index('searchUsersByName'),
                query.Var('needle')
              )
            )
          )
        ),
        {
          size: 20,
          after: nextToken
            ? query.Ref(query.Collection('contacts'), nextToken)
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
        id: user.ref.id
      })),
      nextToken: result.after?.[0].id || null
    })
  };
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
