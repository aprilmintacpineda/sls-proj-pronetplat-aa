const {
  initClient,
  hardDeleteByIndex
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');

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

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
