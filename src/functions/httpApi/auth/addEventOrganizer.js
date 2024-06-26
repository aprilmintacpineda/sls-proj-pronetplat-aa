const { query } = require('faunadb');
const {
  initClient,
  existsByIndex,
  create,
  getById,
  updateById,
  hardDeleteByIndex
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  createNotification,
  invokeEvent
} = require('dependencies/utils/invokeLambda');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, params: { eventId }, formBody }) {
  if (formBody.contactId === authUser.id) return { statusCode: 400 };

  const faunadb = initClient();

  try {
    await faunadb.query(
      query.Let(
        {
          numOrganizers: query.Select(
            ['data', 'numOrganizers'],
            getById('_events', eventId)
          )
        },
        query.If(
          query.And(
            existsByIndex(
              'eventOrganizerByOrganizerEvent',
              authUser.id,
              eventId
            ),
            existsByIndex(
              'contactByOwnerContact',
              formBody.contactId,
              authUser.id
            ),
            query.Not(
              existsByIndex(
                'eventOrganizerByOrganizerEvent',
                formBody.contactId,
                eventId
              )
            ),
            query.LT(query.Var('numOrganizers'), 20)
          ),
          query.Do(
            query.If(
              existsByIndex(
                'eventInvitationByUserEventStatus',
                formBody.contactId,
                eventId,
                'pending'
              ),
              query.Do(
                hardDeleteByIndex(
                  'eventInvitationByUserEventStatus',
                  formBody.contactId,
                  eventId,
                  'pending'
                ),
                query.Call(
                  'updateUserBadgeCount',
                  formBody.contactId,
                  'eventInvitationsCount',
                  -1
                )
              ),
              null
            ),
            create('eventOrganizers', {
              eventId,
              userId: formBody.contactId
            }),
            updateById('_events', eventId, {
              numOrganizers: query.Add(query.Var('numOrganizers'), 1)
            })
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

  await Promise.all([
    invokeEvent({
      eventName: 'notifyAllEventOrganizers',
      payload: {
        eventId,
        authUser,
        body: '{fullname} added {userFullName} as an organizer from {eventName}.',
        title: 'Added as organizer to {eventName}',
        type: 'addedAsOrganizerToEvent',
        exclude: [formBody.contactId],
        payload: {
          eventId,
          userId: formBody.contactId
        }
      }
    }),
    createNotification({
      authUser,
      recipientId: formBody.contactId,
      body: '{fullname} added you as an organizer to {eventName}.',
      title: 'Added as organizer to {eventName}',
      type: 'addedAsOrganizerToEvent',
      payload: { eventId }
    })
  ]);

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete],
  formValidator: ({ contactId }) => validate(contactId, ['required'])
});
