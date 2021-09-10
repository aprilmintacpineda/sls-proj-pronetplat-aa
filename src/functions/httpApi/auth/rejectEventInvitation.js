const { query } = require('faunadb');
const {
  initClient,
  update,
  selectRef,
  getById
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
  let invitation = null;

  try {
    invitation = await faunadb.query(
      query.Let(
        {
          invitation: getById('eventInvitations', invitationId),
          _event: getById(
            '_events',
            query.Select(
              ['data', 'eventId'],
              query.Var('invitation')
            )
          )
        },
        query.If(
          query.And(
            query.Equals(
              query.Select(
                ['data', 'status'],
                query.Var('invitation')
              ),
              'pending'
            ),
            query.LT(
              query.Time(
                query.Select(
                  ['data', 'startDateTime'],
                  query.Var('_event')
                )
              ),
              query.Now()
            )
          ),
          query.Do(
            update(selectRef(query.Var('invitation')), {
              status: 'rejected'
            }),
            query.Call(
              'updateUserBadgeCount',
              authUser.id,
              'eventInvitationsCount',
              -1
            ),
            query.Var('invitation')
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
    recipientId: invitation.data.inviterId,
    body: '{fullname} has rejected your invitation to join {eventName}',
    title: 'Event invitation rejected',
    type: 'eventInvitationRejected',
    payload: {
      eventId: invitation.data.eventId,
      eventInvitationId: invitation.ref.id
    }
  });

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
