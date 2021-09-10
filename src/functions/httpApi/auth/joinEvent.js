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
      query.Let(
        {
          _event: getById('_events', eventId)
        },
        query.If(
          query.And(
            query.Equals(
              query.Select(
                ['data', 'visibility'],
                query.Var('_event')
              ),
              'public'
            ),
            query.Equals(
              query.Select(['data', 'status'], query.Var('_event')),
              'published'
            ),
            query.GT(
              query.Time(
                query.Select(
                  ['data', 'startDateTime'],
                  query.Var('_event')
                )
              ),
              query.Now()
            ),
            query.LT(
              query.Select(
                ['data', 'numGoing'],
                query.Var('_event')
              ),
              query.Select(
                ['data', 'maxAttendees'],
                query.Var('_event')
              )
            ),
            query.Not(
              existsByIndex(
                'eventOrganizerByOrganizerEvent',
                authUser.id,
                eventId
              )
            ),
            query.Not(
              existsByIndex(
                'eventInvitationByUserEventStatus',
                authUser.id,
                eventId,
                'pending'
              )
            ),
            query.Not(
              existsByIndex(
                'eventAttendeeByUserEventStatus',
                authUser.id,
                eventId,
                'active'
              )
            )
          ),
          query.Do(
            create('eventAttendees', {
              userId: authUser.id,
              eventId,
              status: 'active'
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
