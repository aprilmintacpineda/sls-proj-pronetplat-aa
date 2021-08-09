const { query } = require('faunadb');
const {
  initClient,
  updateById,
  hardDeleteByIndex,
  getById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');

async function handler ({ authUser, params: { eventId } }) {
  const faunadb = initClient();

  await faunadb.query(
    query.Do(
      hardDeleteByIndex(
        'eventAttendeeByUserEvent',
        authUser.id,
        eventId
      ),
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
    )
  );

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
