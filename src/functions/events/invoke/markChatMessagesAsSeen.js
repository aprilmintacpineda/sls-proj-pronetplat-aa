const { query } = require('faunadb');
const { initClient, update } = require('dependencies/utils/faunadb');

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

  await faunadb.query(query.Do(...queries));
  // @todo send websocket event to userId about the chat messages that were marked as seen
};
