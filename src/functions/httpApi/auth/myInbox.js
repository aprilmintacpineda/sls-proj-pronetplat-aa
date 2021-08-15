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
  const nextTokenParts = nextToken ? nextToken.split('___') : null;

  const result = await faunadb.query(
    query.Map(
      query.Paginate(
        query.Match(query.Index('inboxByUserId'), authUser.id),
        {
          size: 1,
          after: nextTokenParts
            ? [
                nextTokenParts[0],
                query.Ref(
                  query.Collection('chatInboxes'),
                  nextTokenParts[1]
                )
              ]
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
            )
          },
          {
            inbox: query.Var('inbox'),
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
          }
        )
      )
    )
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(
        ({ inbox, contact, isConnected, lastMessage }) => ({
          ...inbox.data,
          contact: {
            ...getPublicUserData(contact),
            isConnected
          },
          lastMessage: {
            id: lastMessage.ref.id,
            ...lastMessage.data
          }
        })
      ),
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
