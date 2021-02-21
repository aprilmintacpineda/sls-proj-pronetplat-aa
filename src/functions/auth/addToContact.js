const { query } = require('faunadb');
const {
  initClient,
  hasCompletedSetupQuery,
  create,
  isOnBlockList,
  hasPendingContactRequest,
  getById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const {
  sendPushNotification
} = require('dependencies/utils/notifications');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody }) {
  if (formBody.contactId === authUser.id) {
    console.log('Cannot add self to contacts');
    return { statusCode: 400 };
  }

  const faunadb = initClient();

  if (
    await faunadb.query(isOnBlockList(authUser, formBody.contactId))
  ) {
    console.log('On block list');
    return { statusCode: 400 };
  }

  try {
    await faunadb.query(
      query.If(
        hasPendingContactRequest(authUser, formBody.contactId),
        query.Abort('hasPendingRequest'),
        query.If(
          hasCompletedSetupQuery(
            getById('users', formBody.contactId)
          ),
          query.Do(
            create('contactRequests', {
              senderId: authUser.id,
              recipientId: formBody.contactId,
              canFollowUpAt: query.Format(
                '%t',
                query.TimeAdd(query.Now(), 1, 'day')
              )
            }),
            query.Call(
              'updateUserBadgeCount',
              formBody.contactId,
              'receivedContactRequestsCount',
              1
            )
          ),
          query.Abort('NotYetSetup')
        )
      )
    );
  } catch (error) {
    console.log('error', error);

    if (error.description === 'hasPendingRequest')
      return { statusCode: 422 };

    return { statusCode: 400 };
  }

  await sendPushNotification({
    userId: formBody.contactId,
    title: 'Contact request',
    body:
      '{fullname} wants to add you to {genderPossessiveLowercase} contacts.',
    type: 'contactRequest',
    category: 'contactRequest',
    authUser
  });

  return { statusCode: 200 };
}

module.exports.handler = httpGuard({
  handler,
  guards: [
    guardTypes.auth,
    guardTypes.deviceToken,
    guardTypes.setupComplete
  ],
  formValidator: ({ contactId }) => validate(contactId, ['required'])
});
