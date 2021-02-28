const { query } = require('faunadb');
const {
  initClient,
  getByIndex,
  update,
  selectRef
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const {
  createNotification
} = require('dependencies/utils/notifications');

async function handler ({ authUser, params: { contactId } }) {
  const faunadb = initClient();

  try {
    await faunadb.query(
      query.Let(
        {
          contactRequest: getByIndex(
            'contactRequestBySenderIdRecipientId',
            authUser.id,
            contactId
          )
        },
        query.If(
          query.LT(
            query.Now(),
            query.Time(
              query.Select(
                ['data', 'canFollowUpAt'],
                query.Var('contactRequest')
              )
            )
          ),
          query.Abort('canFollowUpAtNotPastYet'),
          update(selectRef(query.Var('contactRequest')), {
            canFollowUpAt: query.Format(
              '%t',
              query.TimeAdd(query.Now(), 1, 'day')
            )
          })
        )
      )
    );
  } catch (error) {
    console.log('error', error);

    if (error.description === 'canFollowUpAtNotPastYet')
      return { statusCode: 429 };

    return { statusCode: 500 };
  }

  await createNotification({
    authUser,
    userId: contactId,
    type: 'contactRequestFollowUp',
    body: '{fullname} followed up with his contact request',
    title: 'Contact request',
    category: 'notification'
  });

  return { statusCode: 200 };
}

module.exports.handler = httpGuard({
  handler,
  guards: [
    guardTypes.auth,
    guardTypes.deviceToken,
    guardTypes.setupComplete
  ]
});
