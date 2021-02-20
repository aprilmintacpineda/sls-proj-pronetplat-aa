const { query } = require('faunadb');
const ContactRequest = require('dependencies/models/ContactRequest');
const {
  hasTimePassed,
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
  } catch (error) {
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
      authUser.id,
      formBody.contactId
    );
  } catch (error) {
    console.log(error);
    return { statusCode: 400 };
  }

  if (!hasTimePassed(contactRequest.data.canFollowUpAt)) {
    console.log('canFollowUpAt has not passed yet');
    return { statusCode: 429 };
  }

  await Promise.all([
    createNotification({
      authUser,
      userId: contactRequest.data.recipientId,
      type: 'contactRequestFollowUp',
      body: '{fullname} followed up with his contact request',
      title: 'Contact request',
      category: 'notification'
    }),
    contactRequest.update({
      canFollowUpAt: query.Format(
        '%t',
        query.TimeAdd(query.Now(), 1, 'day')
      )
    })
  ]);

  return { statusCode: 200 };
};
