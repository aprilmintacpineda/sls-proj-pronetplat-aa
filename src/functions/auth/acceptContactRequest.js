const { query } = require('faunadb');
const {
  initClient,
  createIfNotExists,
  getByIndexIfExists
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  createNotification
} = require('dependencies/utils/notifications');

async function handler ({ authUser, params: { senderId } }) {
  const faunadb = initClient();

  const contactRequest = await faunadb.query(
    getByIndexIfExists(
      'contactRequestBySenderIdRecipientId',
      senderId,
      authUser.id
    )
  );

  if (!contactRequest) {
    console.log('Contact request does not exist');
    return { statusCode: 400 };
  }

  await faunadb.query(
    query.Do(
      createIfNotExists({
        collection: 'contacts',
        index: 'contactByOwnerContact',
        args: [authUser.id, contactRequest.data.senderId],
        data: {
          userId: authUser.id,
          contactId: contactRequest.data.senderId,
          numTimesOpened: 0,
          isCloseFriend: false,
          numNewChatMessages: 0
        }
      }),
      createIfNotExists({
        collection: 'contacts',
        index: 'contactByOwnerContact',
        args: [contactRequest.data.senderId, authUser.id],
        data: {
          userId: contactRequest.data.senderId,
          contactId: authUser.id,
          numTimesOpened: 0,
          isCloseFriend: false,
          numNewChatMessages: 0
        }
      }),
      query.Call(
        'updateUserBadgeCount',
        authUser.id,
        'contactsCount',
        1
      ),
      query.Delete(contactRequest.ref)
    )
  );

  await createNotification({
    authUser,
    userId: contactRequest.data.senderId,
    body: '{fullname} has accepted your contact request.',
    title: 'Contact request accepted',
    type: 'contactRequestAccepted'
  });

  return { statusCode: 200 };
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
