const { query } = require('faunadb');
const {
  initClient,
  existsByIndex,
  create,
  getById,
  updateById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');

async function handler ({ authUser, params: { eventId } }) {
  const faunadb = initClient();

  try {
    await faunadb.query(
      query.If(
        query.And(
          query.Not(
            existsByIndex(
              'eventOrganizerByOrganizerEvent',
              authUser.id,
              eventId
            )
          ),
          query.Not(
            existsByIndex(
              'eventInvitationByUserEvent',
              authUser.id,
              eventId
            )
          ),
          query.Not(
            existsByIndex(
              'eventAttendeeByUserEvent',
              authUser.id,
              eventId
            )
          ),
          query.Let(
            {
              _event: getById('_events', eventId)
            },
            query.LT(
              query.Select(
                ['data', 'numGoing'],
                query.Var('_event')
              ),
              query.Select(
                ['data', 'maxAttendees'],
                query.Var('_event')
              )
            )
          )
        ),
        query.Do(
          create('eventAttendees', {
            userId: authUser.id,
            eventId
          }),
          updateById('_events', eventId, {
            numGoing: query.Add(
              query.Select(
                ['data', 'numGoing'],
                query.Var('_event')
              ),
              1
            )
          })
        ),
        query.Abort('CheckFailed')
      )
    );
  } catch (error) {
    console.log(error);

    if (error.description === 'CheckFailed')
      return { statusCode: 400 };

    return { statusCode: 500 };
  }

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
