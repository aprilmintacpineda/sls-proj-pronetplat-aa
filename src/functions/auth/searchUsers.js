const { query } = require('faunadb');
const {
  initClient,
  isOnBlockList,
  getByIndexIfExists
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const { getPublicUserData } = require('dependencies/utils/users');

async function handler ({
  authUser,
  params: { search, searchBy, nextToken }
}) {
  if (!search || (searchBy !== 'name' && searchBy !== 'username'))
    return { statusCode: 400 };

  const fauna = initClient();
  let result = [];

  if (searchBy === 'name') {
    result = await fauna.query(
      query.Filter(
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
        ),
        query.Lambda(
          ['user'],
          query.And(
            query.Not(
              isOnBlockList(
                authUser.id,
                query.Select(['ref', 'id'], query.Var('user'))
              )
            ),
            query.Select(
              ['data', 'allowSearchByName'],
              query.Var('user'),
              false
            )
          )
        )
      )
    );
  } else {
    const user = await fauna.query(
      getByIndexIfExists('userByUsername', search)
    );

    if (user && user.data.allowSearchByUsername)
      result = { data: [user] };
    else result = { data: [] };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(user => getPublicUserData(user)),
      nextToken: result.after?.[0].id || null
    })
  };
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
