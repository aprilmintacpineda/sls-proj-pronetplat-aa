const ContactRequest = require('dependencies/nodejs/models/ContactRequest');
const Notification = require('dependencies/nodejs/models/Notification');
const User = require('dependencies/nodejs/models/User');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const {
  sendPushNotification
} = require('dependencies/nodejs/utils/notifications');
const {
  getFullName,
  getUserPublicResponseData,
  throwIfNotCompletedSetup
} = require('dependencies/nodejs/utils/users');
const validate = require('dependencies/nodejs/utils/validate');

function hasErrors ({ senderId }) {
  return validate(senderId, ['required']);
}

module.exports.handler = async ({ headers, body }) => {
  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('invalid body');

    const { data: authUser } = await jwt.verify(
      getAuthTokenFromHeaders(headers)
    );

    throwIfNotCompletedSetup(authUser);

    const contactRequest = new ContactRequest();
    await contactRequest.getByIndex(
      'contactRequestBySenderIdRecipientId',
      formBody.senderId,
      authUser.id
    );

    const notification = new Notification();
    const user = new User();

    await Promise.all([
      contactRequest.hardDelete(),
      notification.create({
        userId: contactRequest.data.senderId,
        type: 'contactRequestDeclined',
        body: '{fullname} has declined your contact request.',
        actorId: authUser.id
      }),
      user.callUDF(
        'updateUserBadgeCount',
        authUser.id,
        'receivedContactRequestsCount',
        -1
      )
    ]);

    await sendPushNotification({
      userId: contactRequest.data.senderId,
      imageUrl: authUser.profilePicture,
      title: 'Contact request declined',
      body: `${getFullName(
        authUser
      )} has declined your contact request.`,
      type: 'contactRequestDeclined',
      category: 'notification',
      data: getUserPublicResponseData(authUser)
    });

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
