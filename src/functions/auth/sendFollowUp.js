const { differenceInDays } = require('date-fns');
const { query } = require('faunadb');
const ContactRequest = require('dependencies/nodejs/models/ContactRequest');
const Notification = require('dependencies/nodejs/models/Notification');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const {
  sendPushNotification
} = require('dependencies/nodejs/utils/notifications');
const validate = require('dependencies/nodejs/utils/validate');

function hasErrors ({ contactId }) {
  return validate(contactId, ['required']);
}

module.exports.handler = async ({ headers, body }) => {
  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('Invalid form body');

    const { contactId } = formBody;

    const {
      data: {
        id,
        firstName,
        middleName,
        surname,
        profilePicture,
        bio,
        company,
        jobTitle
      }
    } = await jwt.verify(getAuthTokenFromHeaders(headers));

    const contactRequest = new ContactRequest();
    await contactRequest.getByIndex(
      'contactRequestBySenderIdRecipientId',
      id,
      contactId
    );

    const {
      recipientId,
      lastFollowUpAt,
      createdAt
    } = contactRequest.data;

    if (
      (!lastFollowUpAt &&
        differenceInDays(new Date(), new Date(createdAt)) < 1) ||
      (lastFollowUpAt &&
        differenceInDays(new Date(), new Date(lastFollowUpAt)) < 1)
    )
      throw new Error('Must wait until tomorrow to send follow up');

    const notification = new Notification();

    await Promise.all([
      notification.create({
        userId: recipientId,
        type: 'contactRequestFollowUp',
        body: '{fullname} followed up with his contact request',
        actorId: id
      }),
      contactRequest.update({
        lastFollowUpAt: query.Format('%t', query.Now())
      })
    ]);

    const fullName =
      firstName + (middleName ? ` ${middleName} ` : ' ') + surname;

    await sendPushNotification({
      userId: recipientId,
      imageUrl: profilePicture,
      title: 'Contact request',
      body: `${fullName} followed up with his contact request`,
      type: 'contactRequestFollowUp',
      category: 'notification',
      data: {
        id,
        profilePicture,
        firstName,
        middleName,
        surname,
        bio,
        company,
        jobTitle
      }
    });

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
