const { query } = require('faunadb');
const {
  initClient,
  ifOwnedByUser,
  getById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const { invokeEvent } = require('dependencies/utils/lambda');

async function handler ({
  authUser,
  params: { contactId, nextToken }
}) {
  try {
    const faunadb = initClient();

    const result = await faunadb.query(
      ifOwnedByUser(
        authUser.id,
        getById('contacts', contactId),
        query.Map(
          query.Paginate(
            query.Match(
              query.Index('contactDetailsByUserId'),
              query.Select(
                ['data', 'contactId'],
                query.Var('document')
              )
            ),
            {
              size: 20,
              after: nextToken
                ? query.Ref(
                    query.Collection('contactDetails'),
                    nextToken
                  )
                : []
            }
          ),
          query.Lambda(['ref'], query.Get(query.Var('ref')))
        )
      )
    );

    await invokeEvent({
      functionName: process.env.fn_incrementNumTimesOpened,
      payload: { id: contactId }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: result.data.map(contactDetail => ({
          ...contactDetail.data,
          id: contactDetail.ref.id
        })),
        nextToken: result.after?.[0].id || null
      })
    };
  } catch (error) {
    console.log('error', error);

    if (error.decription === 'authUserDoesNotOwnDocument')
      return { statusCode: 404 };

    return { statusCode: 500 };
  }
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
