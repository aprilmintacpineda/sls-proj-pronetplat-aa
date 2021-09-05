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
const { invokeEvent } = require('dependencies/utils/invokeLambda');

async function handler ({ authUser, params: { eventId } }) {
  const faunadb = initClient();
  let event = null;

  try {
    // if organizer was set,
    event = await faunadb.query(
      query.If(
        query.And(
          existsByIndex(
            'eventOrganizerByOrganizerEvent',
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
        query.Abort('CheckFailed')
      )
    );
  } catch (error) {
    console.log(error);

    if (error.description === 'CheckFailed')
      return { statusCode: 400 };

    return { statusCode: 500 };
  }

  if (event.data.visibility === 'public') {
    await invokeEvent({
      eventName: 'notifyAllContacts',
      payload: {
        authUser,
        body: '{fullname} has published {eventName} you might be interested in.',
        title: 'New event from your contact',
        type: 'contactPublishedAnEvent'
      }
    });
  }

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
