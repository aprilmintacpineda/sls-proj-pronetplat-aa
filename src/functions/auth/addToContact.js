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

async function handler ({ authUser, params: { contactId } }) {
  if (contactId === authUser.id) {
    console.log('Cannot add self to contacts');
    return { statusCode: 400 };
  }

  const faunadb = initClient();

  if (await faunadb.query(isOnBlockList(authUser, contactId))) {
    console.log('On block list');
    return { statusCode: 400 };
  }

  try {
    await faunadb.query(
      query.If(
        hasPendingContactRequest(authUser, contactId),
        query.Abort('hasPendingRequest'),
        query.If(
          hasCompletedSetupQuery(getById('users', contactId)),
          query.Do(
            create('contactRequests', {
              senderId: authUser.id,
              recipientId: contactId,
              canFollowUpAt: query.Format(
                '%t',
                query.TimeAdd(query.Now(), 1, 'day')
              )
            }),
            query.Call(
              'updateUserBadgeCount',
              contactId,
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
    userId: contactId,
    title: 'Contact request',
    body:
      '{fullname} wants to add you to {genderPossessiveLowercase} contacts.',
    type: 'contactRequest',
    category: 'contactRequest',
    authUser,
    data: {
      type: 'contactRequest',
      category: 'contactRequest'
    }
  });

  return { statusCode: 200 };
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
