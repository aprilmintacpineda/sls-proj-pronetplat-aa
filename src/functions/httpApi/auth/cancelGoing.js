const { query } = require('faunadb');
const {
  initClient,
  updateById,
  getById,
  updateByIndex,
  updateByIndexIfExists
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
        query.GT(
          query.Time(
            query.Select(
              ['data', 'startDateTime'],
              getById('_events', eventId)
            )
          ),
          query.Now()
        ),
        query.Do(
          updateByIndex({
            index: 'eventAttendeeByUserEventStatus',
            args: [authUser.id, eventId, 'active'],
            data: { status: 'cancelled' }
          }),
          updateByIndexIfExists({
            index: 'eventInvitationByUserEventStatus',
            args: [authUser.id, eventId, 'accepted'],
            data: { status: 'cancelled' }
          }),
          updateById('_events', eventId, {
            numGoing: query.Subtract(
              query.Select(
                ['data', 'numGoing'],
                getById('_events', eventId)
              ),
              1
            )
          }),
          query.Call(
            'updateUserBadgeCount',
            authUser.id,
            'eventInvitationsCount',
            -1
          )
        ),
        query.Abort('ValidationError')
      )
    );
  } catch (error) {
    console.log(error);

    if (error.description === 'ValidationError')
      return { statusCode: 400 };

    return { statusCode: 500 };
  }

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
