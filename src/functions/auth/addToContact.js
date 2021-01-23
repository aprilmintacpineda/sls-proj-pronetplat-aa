const ContactRequest = require('dependencies/nodejs/models/ContactRequest');
const User = require('dependencies/nodejs/models/User');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const {
  sendPushNotification
} = require('dependencies/nodejs/utils/notifications');

module.exports.handler = async ({
  pathParameters: { contactId },
  headers
}) => {
  try {
    const { data: authUser } = await jwt.verify(
      getAuthTokenFromHeaders(headers)
    );

    if (contactId === authUser.id)
      throw new Error('Cannot add self to contacts');

    const user = new User();
    const targetUser = new User();
    const contactRequest = new ContactRequest();
    const [
      pendingReceivedRequest,
      pendingSentRequest
    ] = await Promise.all([
      contactRequest.hasPendingRequest({
        senderId: contactId,
        recipientId: authUser.id
      }),
      contactRequest.hasPendingRequest({
        senderId: authUser.id,
        recipientId: contactId
      })
    ]);

    if (pendingSentRequest || pendingReceivedRequest) {
      return {
        statusCode: 422,
        body: pendingSentRequest
          ? 'pendingSentRequest'
          : 'pendingReceivedRequest'
      };
    }

    await targetUser.getById(contactId);

    await Promise.all([user.getById(authUser.id)]);

    if (!targetUser.data.completedFirstSetupAt)
      throw new Error('Target user not setup.');

    await contactRequest.create({
      senderId: authUser.id,
      recipientId: targetUser.data.id
    });

    let fullName = authUser.firstName;
    fullName += authUser.middleName
      ? ` ${authUser.middleName} `
      : ' ';
    fullName += authUser.surname;

    const pronoun = authUser.gender === 'male' ? 'his' : 'her';

    await sendPushNotification({
      userId: targetUser.data.id,
      imageUrl: authUser.profilePicture,
      title: 'Contact request',
      body: `${fullName} wants to add you to ${pronoun} contacts.`,
      type: 'contactRequest',
      category: 'contactRequest',
      data: {
        profilePicture: authUser.profilePicture,
        firstName: authUser.firstName,
        middleName: authUser.middleName,
        surname: authUser.surname
      }
    });

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
