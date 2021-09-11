const { query } = require('faunadb');
const {
  initClient,
  getById,
  update,
  selectRef
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  createNotification
} = require('dependencies/utils/invokeLambda');

async function handler ({ authUser, params: { invitationId } }) {
  const faunadb = initClient();
  let eventInvitation = null;

  try {
    eventInvitation = await faunadb.query(
      query.Let(
        {
          eventInvitation: getById('eventInvitations', invitationId),
          _event: getById(
            '_events',
            query.Select(
              ['data', 'eventId'],
              query.Var('eventInvitation')
            )
          )
        },
        query.If(
          query.LT(
            query.Now(),
            query.Time(
              query.Select(
                ['data', 'startDateTime'],
                query.Var('_event')
              )
            )
          ),
          query.Let(
            {
              eventInvitation: update(
                selectRef(query.Var('eventInvitation')),
                {
                  status: 'cancelled'
                }
              )
            },
            query.Do(
              query.Call(
                'updateUserBadgeCount',
                query.Select(
                  ['data', 'userId'],
                  query.Var('eventInvitation')
                ),
                'eventInvitationsCount',
                -1
              ),
              query.Var('eventInvitation')
            )
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

  await createNotification({
    authUser,
    recipientId: eventInvitation.data.userId,
    body: '{fullname} has cancelled {genderPossessiveLowercase} event invitation for {eventName}.',
    title: 'Event invitation cancelled',
    type: 'eventInvitationCancelled',
    payload: {
      eventId: eventInvitation.data.eventId,
      eventInvitationId: eventInvitation.ref.id
    }
  });

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
