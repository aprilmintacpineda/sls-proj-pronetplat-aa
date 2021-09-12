const { query } = require('faunadb');
const {
  initClient,
  hardDeleteByIndex,
  getById,
  updateById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  createNotification,
  invokeEvent
} = require('dependencies/utils/invokeLambda');

async function handler ({
  authUser,
  params: { eventId, organizerId }
}) {
  if (organizerId === authUser.id) return { statusCode: 400 };

  const faunadb = initClient();

  await faunadb.query(
    query.Let(
      {
        numOrganizers: query.Select(
          ['data', 'numOrganizers'],
          getById('_events', eventId)
        )
      },
      query.Do(
        hardDeleteByIndex(
          'eventOrganizerByOrganizerEvent',
          organizerId,
          eventId
        ),
        updateById('_events', eventId, {
          numOrganizers: query.Subtract(
            query.Var('numOrganizers'),
            1
          )
        })
      )
    )
  );

  await Promise.all([
    invokeEvent({
      eventName: 'notifyAllEventOrganizers',
      payload: {
        eventId,
        authUser,
        body: '{fullname} removed {userFullNamePossessive} as an organizer from {eventName}.',
        title: 'Removed as organizer to {eventName}',
        type: 'addedAsOrganizerToEvent',
        payload: {
          eventId,
          userId: organizerId
        }
      }
    }),
    createNotification({
      authUser,
      recipientId: organizerId,
      body: '{fullname} removed you as an organizer from {eventName}.',
      title: 'Removed as organizer from {eventName}',
      type: 'removedAsOrganizerFromEvent',
      payload: { eventId }
    })
  ]);

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
