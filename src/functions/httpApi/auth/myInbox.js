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
            contactId: query.Select(
              ['data', 'contactId'],
              query.Var('inbox')
            ),
            contact: getById('users', query.Var('contactId')),
            isConnected: existsByIndex(
              'contactByOwnerContact',
              authUser.id,
              query.Var('contactId')
            ),
            lastMessage: getById(
              'chatMessages',
              query.Select(
                ['data', 'lastMessageId'],
                query.Var('inbox')
              )
            )
          },
          query.Merge(query.Select(['data'], query.Var('inbox')), {
            contact: query.Var('contact'),
            isConnected: query.Var('isConnected'),
            lastMessage: query.Var('lastMessage')
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
        contact: {
          ...getPublicUserData(inbox.contact),
          isConnected: inbox.isConnected
        },
        lastMessage: {
          id: inbox.lastMessage.ref.id,
          ...inbox.lastMessage.data
        }
      })),
      nextToken: result.after?.[0].id || null
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});