const { query } = require('faunadb');
const ContactRequest = require('dependencies/nodejs/models/ContactRequest');
const {
  hasTimePassed,
  checkRequiredHeaderValues
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const {
  createNotification
} = require('dependencies/nodejs/utils/notifications');
const {
  throwIfNotCompletedSetup
} = require('dependencies/nodejs/utils/users');
const validate = require('dependencies/nodejs/utils/validate');

function hasErrors ({ contactId }) {
  return validate(contactId, ['required']);
}

module.exports.handler = async ({ headers, body }) => {
  try {
    const { authToken } = checkRequiredHeaderValues(headers);

    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('Invalid form body');

    const { data: authUser } = await jwt.verify(authToken);

    throwIfNotCompletedSetup(authUser);

    const contactRequest = new ContactRequest();
    await contactRequest.getByIndex(
      'contactRequestBySenderIdRecipientId',
      authUser.id,
      formBody.contactId
    );

    if (!hasTimePassed(contactRequest.data.canFollowUpAt))
      throw new Error('canFollowUpAt has not passed yet');

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
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
