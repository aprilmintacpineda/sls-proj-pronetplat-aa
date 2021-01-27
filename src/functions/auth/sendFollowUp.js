const { differenceInDays } = require('date-fns');
const { query } = require('faunadb');
const ContactRequest = require('dependencies/nodejs/models/ContactRequest');
const Notification = require('dependencies/nodejs/models/Notification');
const UserBlocking = require('dependencies/nodejs/models/UserBlocking');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const {
  sendPushNotification
} = require('dependencies/nodejs/utils/notifications');
const {
  getUserPublicResponseData,
  getFullName
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

    const userBlocking = new UserBlocking();
    if (
      await userBlocking.wasBlocked(authUser.id, formBody.contactId)
    )
      throw new Error('User was blocked');

    const contactRequest = new ContactRequest();
    await contactRequest.getByIndex(
      'contactRequestBySenderIdRecipientId',
      authUser.id,
      contactId
    );

    if (
      (!contactRequest.data.lastFollowUpAt &&
        differenceInDays(
          new Date(),
          new Date(contactRequest.data.createdAt)
        ) < 1) ||
      (contactRequest.data.lastFollowUpAt &&
        differenceInDays(
          new Date(),
          new Date(contactRequest.data.lastFollowUpAt)
        ) < 1)
    )
      throw new Error('Must wait until tomorrow to send follow up');

    const notification = new Notification();

    await Promise.all([
      notification.create({
        userId: contactRequest.data.recipientId,
        type: 'contactRequestFollowUp',
        body: '{fullname} followed up with his contact request',
        actorId: authUser.id
      }),
      contactRequest.update({
        lastFollowUpAt: query.Format('%t', query.Now())
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
