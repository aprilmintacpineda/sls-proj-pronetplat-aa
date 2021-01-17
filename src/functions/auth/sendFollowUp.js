const { query } = require('faunadb');
const validate = require('/opt/nodejs/utils/validate');
const jwt = require('/opt/nodejs/utils/jwt');
const {
  getAuthTokenFromHeaders
} = require('/opt/nodejs/utils/helpers');
const {
  sendPushNotification
} = require('/opt/nodejs/utils/firebase');
const ContactRequest = require('/opt/nodejs/models/ContactRequest');
const Notification = require('/opt/nodejs/models/Notification');

function hasErrors ({ contactRequestId }) {
  return validate(contactRequestId, ['required']);
}

module.exports.handler = async ({ headers, body }) => {
  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('Invalid form body');

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
    await contactRequest.getById();

    if (contactRequest.data.senderId !== id)
      throw new Error('User is not the sender');

    const notification = new Notification();

    await Promise.all([
      notification.create({
        userId: id,
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
      userId: id,
      imageUrl: profilePicture,
      title: 'Contact request',
      body: `${fullName} followed up with his contact request`,
      type: 'contactRequestFollowUp',
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
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
