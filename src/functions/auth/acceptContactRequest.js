const { query } = require('faunadb');
const {
  initClient,
  createIfNotExists,
  getByIndexIfExists,
  getByIndex,
  selectData,
  getById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const {
  createNotification
} = require('dependencies/utils/notifications');
const { getPublicUserData } = require('dependencies/utils/users');

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

  const { contactData, userData } = await faunadb.query(
    query.Do(
      createIfNotExists({
        collection: 'contacts',
        index: 'contactByOwnerContact',
        args: [authUser.id, contactRequest.data.senderId],
        data: {
          userId: authUser.id,
          contactId: contactRequest.data.senderId,
          numTimesOpened: 0,
          isCloseFriend: false
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
          isCloseFriend: false
        }
      }),
      query.Call(
        'updateUserBadgeCount',
        authUser.id,
        'contactsCount',
        1
      ),
      query.Delete(contactRequest.ref),
      {
        contactData: selectData(
          getByIndex(
            'contactByOwnerContact',
            contactRequest.data.senderId,
            authUser.id
          )
        ),
        userData: getById('users', authUser.id)
      }
    )
  );

  await createNotification({
    authUser,
    userId: contactRequest.data.senderId,
    type: 'contactRequestAccepted',
    body: '{fullname} has accepted your contact request.',
    title: 'Contact request accepted',
    category: 'notification',
    data: {
      ...contactData,
      user: getPublicUserData(userData)
    }
  });

  return { statusCode: 200 };
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
