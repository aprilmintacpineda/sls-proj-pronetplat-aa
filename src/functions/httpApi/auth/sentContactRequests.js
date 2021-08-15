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
  const nextTokenParts = nextToken ? nextToken.split('___') : null;

  const result = await faunadb.query(
    query.Map(
      query.Paginate(
        query.Match(
          query.Index('contactRequestsBySenderId'),
          authUser.id
        ),
        {
          size: 1,
          after: nextTokenParts
            ? [
                nextTokenParts[0],
                query.Ref(
                  query.Collection('contactRequests'),
                  nextTokenParts[1]
                )
              ]
            : []
        }
      ),
      query.Lambda(['recipientId', 'ref'], {
        contactRequest: query.Get(query.Var('ref')),
        recipient: getById('users', query.Var('recipientId'))
      })
    )
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(({ contactRequest, recipient }) => ({
        ...contactRequest.data,
        id: contactRequest.ref.id,
        recipient: getPublicUserData(recipient)
      })),
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
