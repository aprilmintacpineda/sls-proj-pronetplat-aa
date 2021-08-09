const { query } = require('faunadb');
const {
  initClient,
  getByIndex
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  createNotification
} = require('dependencies/utils/invokeLambda');

async function handler ({ authUser, params: { eventId } }) {
  const faunadb = initClient();

  const invitation = await faunadb.query(
    query.Let(
      {
        invitation: getByIndex(
          'eventInvitationByUserEvent',
          authUser.id,
          eventId
        )
      },
      query.Do(
        query.Delete(query.Select(['ref'], query.Var('invitation'))),
        query.Var('invitation')
      )
    )
  );

  await createNotification({
    authUser,
    userId: invitation.data.inviterId,
    body: '{fullname} has rejected your invitation to join {eventName}',
    title: 'Event invitation rejected',
    type: 'eventInvitationRejected',
    payload: { eventId }
  });

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
