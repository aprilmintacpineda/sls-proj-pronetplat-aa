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

async function handler ({ authUser, params: { search, nextToken } }) {
  const faunadb = initClient();
  let result;
  let nextNextToken = null;

  if (!search) {
    const nextTokenParts = nextToken ? nextToken.split('___') : null;

    result = await faunadb.query(
      query.Map(
        query.Paginate(
          query.Match(query.Index('contactsByUserId'), authUser.id),
          {
            size: 1,
            after: nextToken
              ? [
                  Number(nextTokenParts[0]),
                  Number(nextTokenParts[1]),
                  nextTokenParts[2],
                  query.Ref(
                    query.Collection('contacts'),
                    nextTokenParts[3]
                  )
                ]
              : []
          }
        ),
        query.Lambda(
          [
            'unreadChatMessagesFromContact',
            'numTimesOpened',
            'contactId',
            'ref'
          ],
          {
            user: getById('users', query.Var('contactId')),
            unreadChatMessagesCount: query.Var(
              'unreadChatMessagesFromContact'
            )
          }
        )
      )
    );

    nextNextToken = result.after
      ? `${result.after[0]}___${result.after[1]}___${result.after[2]}___${result.after[3].id}`
      : null;
  } else {
    result = await faunadb.query(
      query.Map(
        query.Paginate(
          query.Join(
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
            query.Lambda(
              ['ref'],
              query.Match(
                'contactByOwnerContact',
                authUser.id,
                query.Select(['id'], query.Var('ref'))
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
        query.Lambda(
          ['ref'],
          query.Let(
            {
              contact: query.Get(query.Var('ref')),
              user: getById(
                'users',
                query.Select(
                  ['data', 'contactId'],
                  query.Var('contact')
                )
              )
            },
            {
              user: query.Var('user'),
              unreadChatMessagesCount: query.Select(
                ['data', 'unreadChatMessagesFromContact'],
                query.Var('contact')
              )
            }
          )
        )
      )
    );

    nextNextToken = result.after?.[0].id || null;
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(({ user, unreadChatMessagesCount }) => ({
        ...getPublicUserData(user),
        isConnected: true,
        unreadChatMessagesCount
      })),
      nextToken: nextNextToken
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
