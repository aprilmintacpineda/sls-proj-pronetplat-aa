const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const validate = require('dependencies/nodejs/utils/validate');
const jwt = require('dependencies/nodejs/utils/jwt');
const UserBlocking = require('dependencies/nodejs/models/UserBlocking');
const ContactRequest = require('dependencies/nodejs/models/ContactRequest');
const Contact = require('dependencies/nodejs/models/Contact');
const Notification = require('dependencies/nodejs/models/Notification');
const {
  sendPushNotification
} = require('dependencies/nodejs/utils/notifications');

function hasErrors({ contactId }) {
  return validate(contactId, ['required']);
}

module.exports.handler = async ({ body, headers }) => {
  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('invalid form body');

    const { data: authUser } = await jwt.verify(
      getAuthTokenFromHeaders(headers)
    );

    const userBlocking = new UserBlocking();

    const [
      userHasBlockContact,
      contactHasBlockedUser
    ] = await Promise.all([
      userBlocking.countByIndex(
        'userBlockingsByBlockerIdUserId',
        authUser.id,
        formBody.contactId
      ),
      userBlocking.countByIndex(
        'userBlockingsByBlockerIdUserId',
        formBody.contactId,
        authUser.id
      )
    ]);

    if (userHasBlockContact) throw new Error('userHasBlockContact');
    if (contactHasBlockedUser)
      throw new Error('contactHasBlockedUser');

    // block user
    await userBlocking.create({
      blockerId: authUser.id,
      userId: formBody.contactId
    });

    // remove user from contact if exists
    const contact = new Contact();

    await contact.hardDeleteIfExists(
      'contactByOwnerContact',
      authUser.id,
      formBody.contactId
    );

    let fullName = authUser.firstName;
    fullName += authUser.middleName
      ? ` ${authUser.middleName} `
      : ' ';
    fullName += authUser.surname;

    const notification = new Notification();
    const sentContactRequest = new ContactRequest();

    await sentContactRequest.getPendingRequestIfExists({
      senderId: authUser.id,
      recipientId: formBody.contactId
    });

    if (sentContactRequest.instance) {
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

      return { statusCode: 200 };
    }

    const receivedContactRequest = new ContactRequest();

    await receivedContactRequest.getPendingRequestIfExists({
      senderId: formBody.contactId,
      recipientId: authUser.id
    });

    if (receivedContactRequest.instance) {
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

      return { statusCode: 200 };
    }

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
