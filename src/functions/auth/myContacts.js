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

async function handler ({ params: { nextToken }, authUser }) {
  const faunadb = initClient();

  const result = await faunadb.query(
    query.Map(
      query.Paginate(
        query.Match(query.Index('contactsByUserId'), authUser.id),
        {
          size: 20,
          after: nextToken
            ? query.Ref(query.Collection('contacts'), nextToken)
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
        query.Let(
          {
            user: getById('users', query.Var('contactId'))
          },
          query.Merge(query.Var('user'), {
            data: query.Merge(
              query.Select(['data'], query.Var('user')),
              {
                unreadChatMessages: query.Var(
                  'unreadChatMessagesFromContact'
                )
              }
            )
          })
        )
      )
    )
  );

  console.log(JSON.stringify(result, null, 2));

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(user => ({
        ...getPublicUserData(user),
        unreadChatMessages: user.unreadChatMessages
      })),
      nextToken: result.after?.[0].id || null
    })
  };
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
