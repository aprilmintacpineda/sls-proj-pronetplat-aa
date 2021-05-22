const { query } = require('faunadb');
const {
  initClient,
  hasCompletedSetupQuery,
  create,
  isOnBlockList,
  hasPendingContactRequest,
  getById,
  selectData,
  ifCompatibleTestAccountTypes,
  exists
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  sendPushNotification
} = require('dependencies/utils/notifications');
const {
  sendWebSocketEvent
} = require('dependencies/utils/webSocket');

async function handler ({ authUser, params: { contactId } }) {
  if (contactId === authUser.id) {
    console.log('Cannot add self to contacts');
    return { statusCode: 400 };
  }

  const faunadb = initClient();

  if (await faunadb.query(isOnBlockList(authUser.id, contactId))) {
    console.log('On block list');
    return { statusCode: 400 };
  }

  try {
    await faunadb.query(
      query.Let(
        {
          contact: selectData(getById('users', contactId))
        },
        ifCompatibleTestAccountTypes(
          authUser,
          query.Var('contact'),
          query.If(
            hasPendingContactRequest(authUser, contactId),
            query.Abort('hasPendingRequest'),
            query.If(
              hasCompletedSetupQuery(query.Var('contact')),
              query.If(
                exists(
                  'contactByOwnerContact',
                  authUser.id,
                  contactId
                ),
                query.Abort('ContactExists'),
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
                )
              ),
              query.Abort('NotYetSetup')
            )
          )
        )
      )
    );
  } catch (error) {
    console.log('error', error);

    if (error.description === 'hasPendingRequest')
      return { statusCode: 422 };

    return { statusCode: 400 };
  }

  await Promise.all([
    sendPushNotification({
      userId: contactId,
      title: 'Contact request',
      body: '{fullname} wants to add you to {genderPossessiveLowercase} contacts.',
      authUser
    }),
    sendWebSocketEvent({
      type: 'contactRequest',
      authUser,
      userId: contactId
    })
  ]);

  return { statusCode: 200 };
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
