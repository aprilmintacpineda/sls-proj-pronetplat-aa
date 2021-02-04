const { query } = require('faunadb');
const ContactRequest = require('dependencies/nodejs/models/ContactRequest');
const Notification = require('dependencies/nodejs/models/Notification');
const {
  getAuthTokenFromHeaders,
  hasTimePassed
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const {
  sendPushNotification
} = require('dependencies/nodejs/utils/notifications');
const {
  getUserPublicResponseData,
  getFullName,
  throwIfNotCompletedSetup
} = require('dependencies/nodejs/utils/users');
const validate = require('dependencies/nodejs/utils/validate');

function hasErrors ({ contactId }) {
  return validate(contactId, ['required']);
}

module.exports.handler = async ({ headers, body }) => {
  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('Invalid form body');

    const { contactId } = formBody;

    const { data: authUser } = await jwt.verify(
      getAuthTokenFromHeaders(headers)
    );

    throwIfNotCompletedSetup(authUser);

    const contactRequest = new ContactRequest();
    await contactRequest.getByIndex(
      'contactRequestBySenderIdRecipientId',
      authUser.id,
      contactId
    );

    if (!hasTimePassed(contactRequest.data.canFollowUpAt))
      throw new Error('canFollowUpAt has not passed yet');

    const notification = new Notification();

    await Promise.all([
      notification.create({
        userId: contactRequest.data.recipientId,
        type: 'contactRequestFollowUp',
        body: '{fullname} followed up with his contact request',
        actorId: authUser.id
      }),
      contactRequest.update({
        canFollowUpAt: query.Format(
          '%t',
          query.TimeAdd(query.Now(), 1, 'day')
        )
      })
    ]);

    await sendPushNotification({
      userId: contactRequest.data.recipientId,
      imageUrl: authUser.profilePicture,
      title: 'Contact request',
      body: `${getFullName(
        authUser
      )} followed up with his contact request`,
      type: 'contactRequestFollowUp',
      category: 'notification',
      data: getUserPublicResponseData(authUser)
    });

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
