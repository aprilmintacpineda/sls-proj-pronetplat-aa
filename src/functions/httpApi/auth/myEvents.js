const { query } = require('faunadb');
const {
  initClient,
  getById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');

async function handler ({ params: { nextToken }, authUser }) {
  const faunadb = initClient();

  const result = await faunadb.query(
    query.Map(
      query.Paginate(
        query.Match(
          query.Index('eventsByEventOrganizer'),
          authUser.id
        ),
        {
          size: 20,
          after: nextToken
            ? query.Ref(
                query.Collection('eventsByEventOrganizer'),
                nextToken
              )
            : []
        }
      ),
      query.Lambda(
        ['eventId', 'ref'],
        getById('_events', query.Var('eventId'))
      )
    )
  );

  console.log(result.data);

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(event => ({
        ...event.data,
        id: event.ref.id
      })),
      nextToken: result.after?.[0].id || null
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
