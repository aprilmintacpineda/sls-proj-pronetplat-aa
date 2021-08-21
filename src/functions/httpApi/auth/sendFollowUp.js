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
} = require('dependencies/utils/httpGuard');
const {
  createNotification
} = require('dependencies/utils/invokeLambda');

async function handler ({ authUser, params: { contactId } }) {
  const faunadb = initClient();
  let response = null;

  try {
    response = await faunadb.query(
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
              query.TimeAdd(query.Now(), 4, 'hours')
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
    recipientId: contactId,
    type: 'contactRequestFollowUp',
    body: '{fullname} followed up with his contact request',
    title: 'Contact request'
  });

  return {
    statusCode: 200,
    body: JSON.stringify(response.data)
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
