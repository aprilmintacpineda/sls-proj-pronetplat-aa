const { query } = require('faunadb');
const {
  initClient,
  getById
} = require('dependencies/utils/faunadb');
const {
  createNotification
} = require('dependencies/utils/invokeLambda');

module.exports = async notificationParams => {
  const { authUser } = notificationParams;
  const faunadb = initClient();
  let after = [];
  const promises = [];

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

    result.data.forEach(user => {
      promises.push(
        createNotification({
          recipientId: user.ref.id,
          ...notificationParams
        })
      );
    });

    after = result.after;
  } while (after);

  await Promise.all(promises);
};
