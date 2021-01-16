const jwt = require('/opt/nodejs/utils/jwt');
const {
  getAuthTokenFromHeaders
} = require('/opt/nodejs/utils/helpers');
const {
  sendPushNotification
} = require('/opt/nodejs/utils/notifications');
const User = require('/opt/nodejs/models/User');
const ContactRequest = require('/opt/nodejs/models/ContactRequest');

module.exports.handler = async ({
  pathParameters: { contactId },
  headers
}) => {
  try {
    const auth = await jwt.verify(getAuthTokenFromHeaders(headers));

    if (contactId === auth.data.id)
      throw new Error('Cannot add self to contacts');

    const user = new User();
    const targetUser = new User();
    const contactRequest = new ContactRequest();
    const [
      pendingSentRequest,
      pendingReceivedRequest
    ] = await Promise.all([
      contactRequest.hasPendingRequest({
        senderId: contactId,
        recipientId: auth.data.id
      }),
      contactRequest.hasPendingRequest({
        senderId: auth.data.id,
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

    await Promise.all([
      user.getById(auth.data.id),
      targetUser.getById(contactId)
    ]);

    if (!targetUser.data.completedFirstSetupAt)
      throw new Error('Target user not setup.');

    await contactRequest.create({
      senderId: user.data.id,
      recipientId: targetUser.data.id
    });

    const {
      profilePicture,
      firstName,
      middleName,
      surname
    } = user.data;

    let fullName = firstName;
    fullName += middleName ? ` ${middleName} ` : ' ';
    fullName += surname;

    const pronoun = user.data.gender === 'male' ? 'his' : 'her';

    await sendPushNotification({
      userId: targetUser.data.id,
      title: 'Contact request',
      body: `${fullName} wants to add you to ${pronoun} contacts.`,
      type: 'contactRequest',
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
