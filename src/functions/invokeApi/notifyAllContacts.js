const { query } = require('faunadb');
const {
  initClient,
  getById
} = require('dependencies/utils/faunadb');
const {
  createNotification
} = require('dependencies/utils/invokeLambda');

module.exports = async ({ authUser, ...notificationParams }) => {
  const faunadb = initClient();
  let after = [];

  do {
    const result = await faunadb.query(
      query.Map(
        query.Paginate(
          query.Match(query.Index('contactsByUserId'), authUser.id),
          { size: 1000, after }
        ),
        query.Lambda(
          [
            'unreadChatMessagesFromContact',
            'numTimesOpened',
            'contactId',
            'ref'
          ],
          getById('users', query.Var('contactId'))
        )
      )
    );

    await Promise.all(
      result.data.map(({ user }) =>
        createNotification({
          authUser,
          recipientId: user.ref.id,
          ...notificationParams
        })
      )
    );

    after = result.after;
  } while (after);
};
