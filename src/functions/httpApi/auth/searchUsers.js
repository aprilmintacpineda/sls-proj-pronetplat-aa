const { query } = require('faunadb');
const {
  initClient,
  isOnBlockList,
  existsByIndex,
  getByIndex
} = require('dependencies/utils/faunadb');
const { cleanExtraSpaces } = require('dependencies/utils/helpers');
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
      query.Reduce(
        query.Lambda(
          ['accumulator', 'ref'],
          query.Let(
            {
              user: query.Get(query.Var('ref'))
            },
            query.If(
              query.And(
                query.Not(
                  query.Equals(
                    authUser.id,
                    query.Select(['ref', 'id'], query.Var('user'))
                  )
                ),
                query.Select(
                  ['data', 'allowSearchByName'],
                  query.Var('user'),
                  false
                ),
                query.Not(
                  isOnBlockList(
                    authUser.id,
                    query.Select(['ref', 'id'], query.Var('user'))
                  )
                )
              ),
              query.Append(
                query.Merge(query.Var('user'), {
                  data: query.Merge(
                    query.Select(['data'], query.Var('user')),
                    {
                      isConnected: existsByIndex(
                        'contactByOwnerContact',
                        authUser.id,
                        query.Select(
                          ['ref', 'id'],
                          query.Var('user')
                        )
                      )
                    }
                  )
                }),
                query.Var('accumulator')
              ),
              query.Var('accumulator')
            )
          )
        ),
        [],
        query.Paginate(
          query.Intersection(
            query.Union(
              ...cleanExtraSpaces(search, false)
                .toLowerCase()
                .split(/\s/)
                .map(slug =>
                  query.Map(
                    query.NGram(slug, 2, 3),
                    query.Lambda(
                      ['needle'],
                      query.Match(
                        query.Index('searchUsersByName'),
                        query.Var('needle')
                      )
                    )
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
        )
      )
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: result.data[0].map(user => ({
          ...getPublicUserData(user),
          isConnected: user.data.isConnected
        })),
        nextToken: result.after?.[0].id || null
      })
    };
  }

  const user = await faunadb.query(
    query.If(
      existsByIndex('userByUsername', search),
      query.Let(
        {
          user: getByIndex('userByUsername', search)
        },
        query.If(
          query.And(
            query.Not(
              query.Equals(
                authUser.id,
                query.Select(['ref', 'id'], query.Var('user'))
              )
            ),
            query.Select(
              ['data', 'allowSearchByUsername'],
              query.Var('user'),
              false
            ),
            query.Not(
              isOnBlockList(
                authUser.id,
                query.Select(['ref', 'id'], query.Var('user'))
              )
            )
          ),
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
          }),
          null
        )
      ),
      null
    )
  );

  if (user) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: [
          {
            ...getPublicUserData(user),
            isConnected: user.data.isConnected
          }
        ],
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
