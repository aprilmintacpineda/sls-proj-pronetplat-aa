const { getAuthTokenFromHeaders } = require('/opt/nodejs/utils/helpers');
const jwt = require('/opt/nodejs/utils/jwt');
const validate = require('/opt/nodejs/utils/validate');
const { sendPushNotification } = require('/opt/nodejs/utils/notifications');

const ContactRequest = require('/opt/nodejs/models/ContactRequest');
const Notification = require('/opt/nodejs/models/Notification');

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
    if (contactRequest.data.recipientId !== id) throw new Error('user is not recipient.');

    const notification = new Notification();
    const { senderId } = contactRequest.data;

    await Promise.all([
      contactRequest.hardDelete(),
      notification.create({
        userId: senderId,
        type: 'contactRequestDeclined',
        message: '{fullname} has declined your contact request.',
        actorId: id
      })
    ]);

    const fullName = firstName + (middleName ? ` ${middleName} ` : ' ') + surname;

    await sendPushNotification({
      userId: senderId,
      title: 'Contact request declined',
      body: `${fullName} has declined your contact request.`,
      type: 'contactRequestDeclined',
      data: {
        profilePicture,
        firstName,
        middleName,
        surname
      }
    });

    return { statusCode: 200 };
  } catch (error) {
    console.log(error);
  }

  return { statusCode: 403 };
};
