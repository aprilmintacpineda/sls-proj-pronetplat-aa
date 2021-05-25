const { query } = require('faunadb');
const { initClient, update } = require('dependencies/utils/faunadb');
// const {
//   sendWebSocketEvent
// } = require('dependencies/utils/webSocket');

module.exports.handler = async ({
  authUser,
  userId,
  unseenChatMessageIds
}) => {
  const faunadb = initClient();

  const queries = unseenChatMessageIds.map(chatMessageId => {
    // mark all chat messages as seen
    return update(
      query.Ref(query.Collection('chatMessages'), chatMessageId),
      {
        seenAt: query.Format('%t', query.Now())
      }
    );
  });

  // update unread messages badge if contact still exists
  queries.push(
    query.Call(
      'updateContactBadgeCount',
      authUser.id,
      userId,
      'unreadChatMessagesFromContact',
      -unseenChatMessageIds.length
    )
  );

  const seenChatMessages = await faunadb.query(query.Do(...queries));

  console.log(seenChatMessages);

  // await sendWebSocketEvent({
  //   type: 'chatMessageSeen',
  //   authUser,
  //   userId,
  //   payload: { unseenChatMessageIds }
  // });
};
