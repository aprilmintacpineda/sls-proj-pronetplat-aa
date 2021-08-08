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
        query.Union(
          query.Match(
            query.Index('eventsByEventOrganizer'),
            authUser.id
          ),
          query.Match(query.Index('eventsByAttendee'), authUser.id)
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
      query.Lambda(['eventId', 'ref'], {
        event: getById('_events', query.Var('eventId')),
        isGoing: existsByIndex(
          'eventAttendeeByUserEvent',
          authUser.id,
          query.Var('eventId')
        ),
        isOrganizer: existsByIndex(
          'eventOrganizerByOrganizerEvent',
          authUser.id,
          query.Var('eventId')
        ),
        organizers: query.Map(
          query.Paginate(
            query.Match(
              query.Index('eventOrganizersByEvent'),
              query.Var('eventId')
            )
          ),
          query.Lambda(['userId', 'ref'], {
            user: getById('users', query.Var('userId')),
            isConnected: query.If(
              query.Equals(query.Var('userId'), authUser.id),
              false,
              existsByIndex(
                'contactByOwnerContact',
                authUser.id,
                query.Var('userId')
              )
            )
          })
        )
      })
    )
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: result.data.map(({ event, organizers }) => ({
        id: event.ref.id,
        ...event.data,
        organizers: organizers.data.reduce(
          (accumulator, { user, isConnected }) => {
            if (user.ref.id === authUser.id) return accumulator;

            return accumulator.concat({
              ...getPublicUserData(user),
              isConnected
            });
          },
          []
        )
      })),
      nextToken: result.after?.[0].id || null
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
