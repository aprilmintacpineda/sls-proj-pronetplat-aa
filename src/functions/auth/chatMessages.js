const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');

async function handler ({
  authUser,
  params: { contactId, nextToken }
}) {
  const faunadb = initClient();
  const nextTokenParts = nextToken?.split('_') || null;

  const result = await faunadb.query(
    query.Map(
      query.Paginate(
        query.Union(
          query.Match(
            query.Index('contactChatMessages'),
            authUser.id,
            contactId
          ),
          query.Match(
            query.Index('contactChatMessages'),
            contactId,
            authUser.id
          )
        ),
        {
          size: 20,
          after: nextTokenParts
            ? [
                query.Ref(
                  query.Collection('chatMessages'),
                  nextTokenParts[0]
                ),
                query.Ref(
                  query.Collection('chatMessages'),
                  nextTokenParts[1]
                )
              ]
            : []
        }
      ),
      query.Lambda(['createdAt', 'ref'], query.Get(query.Var('ref')))
    )
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(document => ({
        ...document.data,
        id: document.ref.id
      })),
      nextToken: result.after
        ? `${result.after[1].id}_${result.after[2].id}`
        : null
    })
  };
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
