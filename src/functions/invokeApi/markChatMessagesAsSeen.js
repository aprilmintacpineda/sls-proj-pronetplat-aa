const { query } = require('faunadb');
const { initClient, update } = require('dependencies/utils/faunadb');
const {
  sendWebSocketEvent
} = require('dependencies/utils/invokeLambda');

module.exports = async ({
  authUser,
  contactId,
  unseenChatMessageIds
}) => {
  const faunadb = initClient();

  const queries = unseenChatMessageIds.map(chatMessageId => {
    // mark all chat messages as seen
    return update(
      query.Ref(query.Collection('chatMessages'), chatMessageId),
      {
        seenAt: query.Var('seenAt')
      }
    );
  });

  // update unread messages badge if contact still exists
  const amount = -unseenChatMessageIds.length;
  queries.push(
    query.Call(
      'updateContactBadgeCount',
      authUser.id,
      contactId,
      'unreadChatMessagesFromContact',
      amount
    ),
    query.Call(
      'updateOrCreateUserInbox',
      authUser.id,
      contactId,
      '',
      amount
    ),
    query.Call(
      'updateUserBadgeCount',
      authUser.id,
      'unreadChatMessagesCount',
      amount
    )
  );

  const seenAt = await faunadb.query(
    query.Let(
      {
        seenAt: query.Format('%t', query.Now())
      },
      query.Do(query.Do(...queries), query.Var('seenAt'))
    )
  );

  await sendWebSocketEvent({
    type: 'chatMessageSeen',
    authUser,
    recipientId: contactId,
    payload: {
      unseenChatMessageIds,
      seenAt
    }
  });
};
