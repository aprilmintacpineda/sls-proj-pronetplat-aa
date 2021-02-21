const {
  initClient,
  hardDeleteByIndex
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
      hardDeleteByIndex(
        'contactRequestBySenderIdRecipientId',
        formBody.senderId,
        authUser.id
      )
    );
  } catch (error) {
    console.log('error', error);
    return { statusCode: 400 };
  }

  await createNotification({
    authUser,
    userId: formBody.senderId,
    type: 'contactRequestDeclined',
    body: '{fullname} has declined your contact request.',
    title: 'Contact request declined',
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
  formValidator: ({ senderId }) => validate(senderId, ['required'])
});
