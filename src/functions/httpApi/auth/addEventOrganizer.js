const { query } = require('faunadb');
const {
  initClient,
  existsByIndex,
  create,
  getById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  createNotification
} = require('dependencies/utils/invokeLambda');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, params: { eventId }, formBody }) {
  if (formBody.contactId === authUser.id) return { statusCode: 400 };

  const faunadb = initClient();
  let event = null;

  try {
    event = await faunadb.query(
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
          )
        ),
        query.Do(
          create('eventOrganizers', {
            eventId,
            userId: formBody.contactId
          }),
          getById('_events', eventId)
        ),
        query.Abort('CheckFailed')
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
    userId: formBody.contactId,
    body: `{fullname} added you as an organizer to the event ${event.data.name}.`,
    title: 'Added as organizer to event',
    type: 'addedAsOrganizerToEvent'
  });

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete],
  formValidator: ({ contactId }) => validate(contactId, ['required'])
});
