const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');
const {
  createNotification
} = require('dependencies/utils/invokeLambda');

module.exports = async ({ eventId, ...notificationParams }) => {
  const faunadb = initClient();
  let after = [];
  const promises = [];

  do {
    const result = await faunadb.query(
      query.Map(
        query.Paginate(
          query.Match(
            query.Index('eventOrganizersByEvent'),
            eventId
          ),
          { size: 20 }
        ),
        query.Lambda(['userId', 'ref'], query.Var('userId'))
      )
    );

    result.data.forEach(userId => {
      promises.push(
        createNotification({
          recipientId: userId,
          ...notificationParams
        })
      );
    });

    after = result.after;
  } while (after);

  await Promise.all(promises);
};
