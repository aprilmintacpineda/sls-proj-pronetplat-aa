const {
  initClient,
  hardDeleteByIndex
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
    hardDeleteByIndex(
      'eventOrganizerByOrganizerEvent',
      organizerId,
      eventId
    )
  );

  await createNotification({
    authUser,
    userId: organizerId,
    body: '{fullname} removed you as an organizer from an event.',
    title: 'Removed as organizer from an event',
    type: 'removedAsOrganizerFromEvent'
  });

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
