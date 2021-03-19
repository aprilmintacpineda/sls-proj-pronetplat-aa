const { query } = require('faunadb');
const {
  initClient,
  getByIndex,
  createIfNotExists
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const {
  createNotification
} = require('dependencies/utils/notifications');

async function handler ({ authUser, params: { senderId } }) {
  const faunadb = initClient();

  let contactRequest;

  try {
    contactRequest = await faunadb.query(
      getByIndex(
        'contactRequestBySenderIdRecipientId',
        senderId,
        authUser.id
      )
    );
  } catch (error) {
    console.log('error', error);
    return { statusCode: 400 };
  }

  await Promise.all([
    faunadb.query(
      query.Do(
        createIfNotExists({
          collection: 'contacts',
          index: 'contactByOwnerContact',
          args: [authUser.id, contactRequest.data.senderId],
          data: {
            ownerId: authUser.id,
            contactId: contactRequest.data.senderId,
            numTimesOpened: 0
          }
        }),
        createIfNotExists({
          collection: 'contacts',
          index: 'contactByOwnerContact',
          args: [contactRequest.data.senderId, authUser.id],
          data: {
            ownerId: contactRequest.data.senderId,
            contactId: authUser.id,
            numTimesOpened: 0
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
    ),
    createNotification({
      authUser,
      userId: contactRequest.data.senderId,
      type: 'contactRequestAccepted',
      body: '{fullname} has accepted your contact request.',
      title: 'Contact request accepted',
      category: 'notification'
    })
  ]);

  return { statusCode: 200 };
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
