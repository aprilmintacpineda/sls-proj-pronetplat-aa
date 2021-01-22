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

function hasErrors ({ id }) {
  return validate(id, ['required']);
}

module.exports.handler = async ({ headers, body }) => {
  try {
    const {
      data: { id, firstName, middleName, surname, profilePicture }
    } = await jwt.verify(getAuthTokenFromHeaders(headers));

    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('invalid body');

    const contactRequest = new ContactRequest();
    await contactRequest.getById(formBody.id);

    if (contactRequest.data.recipientId !== id)
      throw new Error('user is not recipient.');

    const notification = new Notification();
    const { senderId } = contactRequest.data;

    await Promise.all([
      contactRequest.hardDelete(),
      notification.create({
        userId: senderId,
        type: 'contactRequestDeclined',
        body: '{fullname} has declined your contact request.',
        actorId: id
      })
    ]);

    const fullName =
      firstName + (middleName ? ` ${middleName} ` : ' ') + surname;

    await sendPushNotification({
      userId: senderId,
      imageUrl: profilePicture,
      title: 'Contact request declined',
      body: `${fullName} has declined your contact request.`,
      type: 'contactRequestDeclined',
      category: 'notification',
      data: {
        profilePicture,
        firstName,
        middleName,
        surname
      }
    });

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
