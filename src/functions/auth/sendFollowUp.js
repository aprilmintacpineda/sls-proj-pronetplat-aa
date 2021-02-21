const { query } = require('faunadb');
const {
  initClient,
  getByIndex,
  update
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const {
  createNotification
} = require('dependencies/utils/notifications');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody }) {
  const faunadb = initClient();

  try {
    await faunadb.query(
      query.Let(
        {
          contactRequest: getByIndex(
            'contactRequestBySenderIdRecipientId',
            authUser.id,
            formBody.contactId
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
          update(
            query.Select(['ref'], query.Var('contactRequest')),
            {
              canFollowUpAt: query.Format(
                '%t',
                query.TimeAdd(query.Now(), 1, 'day')
              )
            }
          )
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
    userId: formBody.contactId,
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
  ],
  formValidator: ({ contactId }) => validate(contactId, ['required'])
});
