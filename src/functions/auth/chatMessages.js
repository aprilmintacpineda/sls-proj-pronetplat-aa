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
  const [nextToken1, nextToken2] = nextToken.split('_');

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
          after: nextToken
            ? [
                query.Ref(
                  query.Collection('contactChatMessages'),
                  nextToken1
                ),
                query.Ref(
                  query.Collection('contactChatMessages'),
                  nextToken2
                )
              ]
            : []
        }
      ),
      query.Lambda(['createdAt', 'ref'], query.Get(query.Var('ref')))
    )
  );

  console.log(result);

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(document => ({
        ...document.data,
        id: document.ref.id
      })),
      nextToken: result.after
        ? `${result.after[1].id})_${result.after[2].id}`
        : null
    })
  };
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
