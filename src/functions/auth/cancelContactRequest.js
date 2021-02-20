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

function hasErrors ({ contactId }) {
  return validate(contactId, ['required']);
}

module.exports.handler = async ({ body, headers }) => {
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
  } catch (error) {
    console.log('invalid token');
    return { statusCode: 401 };
  }

  if (!hasCompletedSetup(authUser)) {
    console.log('Not yet setup');
    return { statusCode: 403 };
  }

  const sentContactRequest = new ContactRequest();

  try {
    await sentContactRequest.getByIndex(
      'contactRequestBySenderIdRecipientId',
      authUser.id,
      formBody.contactId
    );
  } catch (error) {
    console.log('error', error);
    return { statusCode: 400 };
  }

  await Promise.all([
    createNotification({
      authUser,
      userId: sentContactRequest.data.recipientId,
      type: 'contactRequestCancelled',
      body:
        '{fullname} has cancelled {genderPossessiveLowercase} contact request.',
      title: 'Contact request cancelled',
      category: 'notification'
    }),
    sentContactRequest.hardDelete()
  ]);

  return { statusCode: 200 };
};
