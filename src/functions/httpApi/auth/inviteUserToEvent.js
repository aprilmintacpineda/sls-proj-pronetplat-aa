const { query } = require('faunadb');
const {
  initClient,
  existsByIndex,
  create,
  getByIndexIfExists
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  sendPushNotification,
  sendWebSocketEvent
} = require('dependencies/utils/invokeLambda');
const { getFullName } = require('dependencies/utils/users');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, params: { eventId }, formBody }) {
  if (formBody.contactId === authUser.id) return { statusCode: 400 };

  const faunadb = initClient();

  try {
    await faunadb.query(
      query.If(
        query.And(
          existsByIndex(
            'contactByOwnerContact',
            formBody.contactId,
            authUser.id
          ),
          query.Let(
            {
              existingInvitation: getByIndexIfExists(
                'eventInvitationByUserEvent',
                query.Var('contactId'),
                eventId
              )
            },
            query.Or(
              query.IsNull(query.Var('existingInvitation')),
              query.ContainsPath(
                ['data', 'rejectedAt'],
                query.Var('existingInvitation')
              )
            )
          )
        ),
        create('eventInvitations', {
          eventId,
          userId: formBody.contactId,
          inviterId: authUser.id
        }),
        query.Abort('CheckFailed')
      )
    );

    await Promise.all([
      sendPushNotification({
        userId: formBody.contactId,
        title: 'Event invitation',
        body: '{fullname} invited you to join an event.',
        authUser
      }),
      sendWebSocketEvent({
        type: 'notification',
        trigger: 'contactRequest',
        authUser,
        userId: formBody.contactId,
        payload: {
          body: `${getFullName(
            authUser
          )} invited you to join an event.`,
          title: 'Event invitation'
        }
      })
    ]);
  } catch (error) {
    console.log(error);

    if (error.description === 'CheckFailed')
      return { statusCode: 400 };

    return { statusCode: 500 };
  }

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete],
  formValidator: ({ contactId }) => validate(contactId, ['required'])
});
