const { query } = require('faunadb');
const {
  initClient,
  isOnBlockList,
  getByIndexIfExists,
  existsByIndex
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const { getPublicUserData } = require('dependencies/utils/users');
const validate = require('dependencies/utils/validate');

async function handler ({
  authUser,
  params: { search, searchBy, nextToken }
}) {
  const faunadb = initClient();

  if (searchBy === 'name') {
    const result = await faunadb.query(
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
                ? query.Ref(query.Collection('users'), nextToken)
                : []
            }
          ),
          query.Lambda(
            ['ref'],
            query.Let(
              {
                user: query.Get(query.Var('ref'))
              },
              query.Merge(query.Var('user'), {
                data: query.Merge(
                  query.Select(['data'], query.Var('user')),
                  {
                    isConnected: existsByIndex(
                      'contactByOwnerContact',
                      authUser.id,
                      query.Select(['ref', 'id'], query.Var('user'))
                    )
                  }
                )
              })
            )
          )
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

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: result.data.map(({ isConnected, ...user }) => ({
          ...getPublicUserData(user),
          isConnected
        })),
        nextToken: result.after?.[0].id || null
      })
    };
  }

  const user = await faunadb.query(
    getByIndexIfExists('userByUsername', search)
  );

  if (user && user.data.allowSearchByUsername) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: [getPublicUserData(user)],
        nextToken: null
      })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: [],
      nextToken: null
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete],
  queryParamsValidator: ({ search, searchBy }) => {
    return (
      validate(search, ['required']) ||
      validate(searchBy, ['required', 'options:name,username'])
    );
  }
});
