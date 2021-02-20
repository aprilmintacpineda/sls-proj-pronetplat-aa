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

function hasErrors ({ contactId }) {
  return validate(contactId, ['required']);
}

module.exports.handler = async ({ body, headers }) => {
  try {
    const { authToken } = checkRequiredHeaderValues(headers);

    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('Invalid form body');

    const { data: authUser } = await jwt.verify(authToken);

    throwIfNotCompletedSetup(authUser);

    const sentContactRequest = new ContactRequest();
    await sentContactRequest.getByIndex(
      'contactRequestBySenderIdRecipientId',
      authUser.id,
      formBody.contactId
    );

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
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
