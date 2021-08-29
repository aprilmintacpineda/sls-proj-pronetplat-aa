const { query } = require('faunadb');
const {
  initClient,
  existsByIndex
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  sendWebSocketEvent
} = require('dependencies/utils/invokeLambda');
const validate = require('dependencies/utils/validate');

async function handler ({
  authUser,
  params: { contactId },
  formBody
}) {
  const faunadb = initClient();

  try {
    await faunadb.query(
      query.If(
        existsByIndex(
          'contactByOwnerContact',
          authUser.id,
          contactId
        ),
        null,
        query.Abort('NotInContact')
      )
    );
  } catch (error) {
    console.log(error);

    if (error.description === 'NotInContact')
      return { statusCode: 400 };

    return 500;
  }

  await sendWebSocketEvent({
    type: 'typingStatus',
    authUser,
    recipientId: contactId,
    payload: {
      isTyping: formBody.isTyping
    }
  });

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  formValidator: ({ isTyping }) =>
    validate(isTyping, ['required', 'bool']),
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
