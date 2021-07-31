const { query } = require('faunadb');
const {
  initClient,
  hardDeleteByIndex,
  getById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  createNotification
} = require('dependencies/utils/invokeLambda');

async function handler ({
  authUser,
  params: { eventId, organizerId }
}) {
  if (organizerId === authUser.id) return { statusCode: 400 };

  const faunadb = initClient();

  await faunadb.query(
    query.Do(
      hardDeleteByIndex(
        'eventOrganizerByOrganizerEvent',
        organizerId,
        eventId
      ),
      getById('_events', eventId)
    )
  );

  await createNotification({
    authUser,
    userId: organizerId,
    body: `{fullname} removed you as an organizer from the event ${event.data.name}.`,
    title: 'Removed as organizer from event',
    type: 'removedAsOrganizerFromEvent'
  });

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
