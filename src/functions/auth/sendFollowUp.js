const { query } = require('faunadb');
const ContactRequest = require('dependencies/models/ContactRequest');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const { hasTimePassed } = require('dependencies/utils/helpers');
const {
  createNotification
} = require('dependencies/utils/notifications');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody }) {
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
