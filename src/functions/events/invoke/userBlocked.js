const ContactRequest = require('dependencies/nodejs/models/ContactRequest');
const Notification = require('dependencies/nodejs/models/Notification');
const {
  sendPushNotification
} = require('dependencies/nodejs/utils/notifications');

module.exports.handler = async ({ authUser, contactId }) => {
  try {
    let fullName = authUser.firstName;
    fullName += authUser.middleName
      ? ` ${authUser.middleName} `
      : ' ';
    fullName += authUser.surname;

    const notification = new Notification();
    const sentContactRequest = new ContactRequest();

    await sentContactRequest.getPendingRequestIfExists({
      senderId: authUser.id,
      recipientId: contactId
    });

    if (sentContactRequest.data) {
      const pronoun = authUser.gender === 'male' ? 'his' : 'her';

      await Promise.all([
        sentContactRequest.hardDelete(),
        notification.create({
          userId: sentContactRequest.data.recipientId,
          type: 'contactRequestCancelled',
          body: `{fullname} has cancelled ${pronoun} contact request.`,
          actorId: authUser.id
        })
      ]);

      await sendPushNotification({
        userId: sentContactRequest.data.recipientId,
        imageUrl: authUser.profilePicture,
        title: 'Contact request cancelled',
        body: `${fullName} has cancelled ${pronoun} contact request.`,
        type: 'contactRequestCancelled',
        category: 'notification',
        data: {
          profilePicture: authUser.profilePicture,
          firstName: authUser.firstName,
          middleName: authUser.middleName,
          surname: authUser.surname
        }
      });

      return;
    }

    const receivedContactRequest = new ContactRequest();

    await receivedContactRequest.getPendingRequestIfExists({
      senderId: contactId,
      recipientId: authUser.id
    });

    if (receivedContactRequest.data) {
      await Promise.all([
        receivedContactRequest.hardDelete(),
        notification.create({
          userId: receivedContactRequest.data.senderId,
          type: 'contactRequestDeclined',
          body: '{fullname} has declined your contact request.',
          actorId: authUser.id
        })
      ]);

      await sendPushNotification({
        userId: receivedContactRequest.data.senderId,
        imageUrl: authUser.profilePicture,
        title: 'Contact request declined',
        body: `${fullName} has declined your contact request.`,
        type: 'contactRequestDeclined',
        category: 'notification',
        data: {
          profilePicture: authUser.profilePicture,
          firstName: authUser.firstName,
          middleName: authUser.middleName,
          surname: authUser.surname
        }
      });
    }
  } catch (error) {
    console.log('error', error);
  }
};
