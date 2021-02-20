const ContactRequest = require('dependencies/models/ContactRequest');
const {
  checkRequiredHeaderValues
} = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const {
  createNotification
} = require('dependencies/utils/notifications');
const { hasCompletedSetup } = require('dependencies/utils/users');
const validate = require('dependencies/utils/validate');

function hasErrors ({ senderId }) {
  return validate(senderId, ['required']);
}

module.exports.handler = async ({ headers, body }) => {
  const headerValues = checkRequiredHeaderValues(headers);

  if (!headerValues) {
    console.log('Invalid headers');
    return { statusCode: 400 };
  }

  const formBody = JSON.parse(body);
  if (hasErrors(formBody)) {
    console.log('Invalid form body');
    return { statusCode: 400 };
  }

  let authUser;

  try {
    const token = await jwt.verify(headerValues.authToken);
    authUser = token.data;
  } catch (_1) {
    console.log('Invalid token');
    return { statusCode: 401 };
  }

  if (!hasCompletedSetup(authUser)) {
    console.log('Not yet setup');
    return { statusCode: 403 };
  }

  const contactRequest = new ContactRequest();

  try {
    await contactRequest.getByIndex(
      'contactRequestBySenderIdRecipientId',
      formBody.senderId,
      authUser.id
    );
  } catch (error) {
    console.log('error', error);
    return { statusCode: 400 };
  }

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
};
