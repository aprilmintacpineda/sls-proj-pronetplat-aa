const { query } = require('faunadb');
const {
  initClient,
  getByIndex,
  create,
  selectRef
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  createNotification
} = require('dependencies/utils/invokeLambda');

async function handler ({ authUser, params: { senderId } }) {
  const faunadb = initClient();
  let contactRequest = null;

  contactRequest = await faunadb.query(
    query.Let(
      {
        contactRequest: getByIndex(
          'contactRequestBySenderIdRecipientId',
          senderId,
          authUser.id
        ),
        senderId: query.Select(
          ['data', 'senderId'],
          query.Var('contactRequest')
        )
      },
      query.Do(
        create('contacts', {
          userId: authUser.id,
          contactId: query.Var('senderId'),
          numTimesOpened: 0,
          isCloseFriend: false,
          unreadChatMessagesFromContact: 0
        }),
        create('contacts', {
          userId: query.Var('senderId'),
          contactId: authUser.id,
          numTimesOpened: 0,
          isCloseFriend: false,
          numNewChatMessages: 0
        }),
        query.Call(
          'updateUserBadgeCount',
          query.Var('senderId'),
          'contactsCount',
          1
        ),
        query.Call(
          'updateUserBadgeCount',
          authUser.id,
          'contactsCount',
          1
        ),
        query.Delete(selectRef(query.Var('contactRequest'))),
        query.Var('contactRequest')
      )
    )
  );

  await createNotification({
    authUser,
    recipientId: contactRequest.data.senderId,
    body: '{fullname} has accepted your contact request.',
    title: 'Contact request accepted',
    type: 'contactRequestAccepted'
  });

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
