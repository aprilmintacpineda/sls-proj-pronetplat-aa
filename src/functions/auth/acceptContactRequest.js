const Contact = require('dependencies/nodejs/models/Contact');
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

    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('invalid form body');

    const contactRequest = new ContactRequest();
    await contactRequest.getById(formBody.id);
    if (contactRequest.data.recipientId !== id)
      throw new Error('user is not recipient.');

    const { senderId } = contactRequest.data;
    const contact = new Contact();

    await Promise.all([
      contact.create({
        ownerId: id,
        contactId: senderId
      }),
      contact.create({
        ownerId: senderId,
        contactId: id
      })
    ]);

    const notification = new Notification();

    await Promise.all([
      contactRequest.hardDelete(),
      notification.create({
        userId: senderId,
        type: 'contactRequestAccepted',
        body: '{fullname} has accepted your contact request.',
        actorId: id
      })
    ]);

    const fullName =
      firstName + (middleName ? ` ${middleName} ` : ' ') + surname;

    await sendPushNotification({
      userId: senderId,
      imageUrl: profilePicture,
      title: 'Contact request accepted',
      body: `${fullName} has accepted your contact request.`,
      type: 'contactRequestAccepted',
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
