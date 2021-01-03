const { getAuthTokenFromHeaders } = require('/opt/nodejs/utils/helpers');
const jwt = require('/opt/nodejs/utils/jwt');
const validate = require('/opt/nodejs/utils/validate');
const { sendPushNotifications } = require('/opt/nodejs/utils/notifications');

const ContactRequest = require('/opt/nodejs/models/ContactRequest');
const Contact = require('/opt/nodejs/models/Contact');
const Notification = require('/opt/nodejs/models/Notification');

function hasErrors ({ id }) {
  return validate(id, ['required']);
}

module.exports.handler = async ({ headers, body }) => {
  try {
    const {
      data: { id, firstName, middleName, surname, profilePicture, bio, company, jobTitle }
    } = await jwt.parse(getAuthTokenFromHeaders(headers));

    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('invalid form body');

    const contactRequest = new ContactRequest();
    await contactRequest.getById(formBody.id);

    const { senderId } = contactRequest.data;

    if (contactRequest.data.recipientId !== id) throw new Error('user is not recipient.');

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

    await contactRequest.hardDelete();

    const notification = new Notification();
    await notification.create({
      userId: senderId,
      type: 'contactRequestAccepted',
      message: '{fullname} has accepted your contact request.',
      actorId: id
    });

    const fullName = firstName + (middleName ? ` ${middleName} ` : ' ') + surname;

    await sendPushNotifications({
      userId: senderId,
      title: 'Contact request accepted',
      body: `${fullName} has accepted your contact request.`,
      type: 'contactRequestAccepted',
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
    console.log(error);
  }

  return { statusCode: 403 };
};
