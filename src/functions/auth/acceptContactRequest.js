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

function hasErrors ({ senderId }) {
  return validate(senderId, ['required']);
}

module.exports.handler = async ({ headers, body }) => {
  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('invalid form body');

    const { data: authUser } = await jwt.verify(
      getAuthTokenFromHeaders(headers)
    );

    const contactRequest = new ContactRequest();
    await contactRequest.getByIndex(
      'contactRequestBySenderIdRecipientId',
      formBody.senderId,
      authUser.id
    );

    const contact = new Contact();

    await Promise.all([
      contact.create({
        ownerId: authUser.id,
        contactId: contactRequest.data.senderId
      }),
      contact.create({
        ownerId: contactRequest.data.senderId,
        contactId: authUser.id
      })
    ]);

    const notification = new Notification();

    await Promise.all([
      contactRequest.hardDelete(),
      notification.create({
        userId: contactRequest.data.senderId,
        type: 'contactRequestAccepted',
        body: '{fullname} has accepted your contact request.',
        actorId: authUser.id
      })
    ]);

    const fullName =
      authUser.firstName +
      (authUser.middleName ? ` ${authUser.middleName} ` : ' ') +
      authUser.surname;

    await sendPushNotification({
      userId: contactRequest.data.senderId,
      imageUrl: authUser.profilePicture,
      title: 'Contact request accepted',
      body: `${fullName} has accepted your contact request.`,
      type: 'contactRequestAccepted',
      category: 'notification',
      data: {
        id: authUser.id,
        profilePicture: authUser.profilePicture,
        firstName: authUser.firstName,
        middleName: authUser.middleName,
        surname: authUser.surname,
        bio: authUser.bio,
        company: authUser.company,
        jobTitle: authUser.jobTitle
      }
    });

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
