const ContactRequest = require('dependencies/models/ContactRequest');
const {
  checkRequiredHeaderValues
} = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const {
  createNotification
} = require('dependencies/utils/notifications');
const {
  throwIfNotCompletedSetup
} = require('dependencies/utils/users');
const validate = require('dependencies/utils/validate');

function hasErrors ({ senderId }) {
  return validate(senderId, ['required']);
}

module.exports.handler = async ({ headers, body }) => {
  try {
    const { authToken } = checkRequiredHeaderValues(headers);

    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('invalid body');

    const { data: authUser } = await jwt.verify(authToken);

    throwIfNotCompletedSetup(authUser);

    const contactRequest = new ContactRequest();
    await contactRequest.getByIndex(
      'contactRequestBySenderIdRecipientId',
      formBody.senderId,
      authUser.id
    );

    await Promise.all([
      contactRequest.hardDelete(),
      createNotification({
        authUser,
        userId: contactRequest.data.senderId,
        type: 'contactRequestDeclined',
        body: '{fullname} has declined your contact request.',
        title: 'Contact request declined',
        category: 'notification'
      })
    ]);

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
