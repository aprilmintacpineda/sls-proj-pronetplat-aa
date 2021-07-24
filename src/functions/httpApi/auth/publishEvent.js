const { query } = require('faunadb');
const {
  initClient,
  existsByIndex,
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
    // if organizer was set,
    await faunadb.query(
      query.If(
        query.And(
          existsByIndex(
            'eventOrganizersByOrganizerEvent',
            authUser.id,
            eventId
          ),
          query.Equals(
            query.Select(
              ['data', 'status'],
              getById('_events', eventId)
            ),
            'unpublished'
          )
        ),
        updateById('_events', eventId, {
          status: 'published'
        }),
        query.Abort('InvalidRequest')
      )
    );
  } catch (error) {
    console.log(error);

    if (error.description === 'InvalidRequest')
      return { statusCode: 400 };

    return { statusCode: 500 };
  }

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
