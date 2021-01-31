const Contact = require('dependencies/nodejs/models/Contact');
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
  getUserPublicResponseData,
  getFullName
} = require('dependencies/nodejs/utils/users');
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
      contact.createIfNotExists({
        index: 'contactByOwnerContact',
        args: [authUser.id, contactRequest.data.senderId],
        data: {
          ownerId: authUser.id,
          contactId: contactRequest.data.senderId
        }
      }),
      contact.createIfNotExists({
        index: 'contactByOwnerContact',
        args: [contactRequest.data.senderId, authUser.id],
        data: {
          ownerId: contactRequest.data.senderId,
          contactId: authUser.id
        }
      })
    ]);

    const notification = new Notification();
    const user = new User();

    await Promise.all([
      contactRequest.hardDelete(),
      notification.create({
        userId: contactRequest.data.senderId,
        type: 'contactRequestAccepted',
        body: '{fullname} has accepted your contact request.',
        actorId: authUser.id
      }),
      user.callUDF(
        'updateUserBadgeCount',
        authUser.id,
        'contactRequestsCount',
        'decrement'
      )
    ]);

    await sendPushNotification({
      userId: contactRequest.data.senderId,
      imageUrl: authUser.profilePicture,
      title: 'Contact request accepted',
      body: `${getFullName(
        authUser
      )} has accepted your contact request.`,
      type: 'contactRequestAccepted',
      category: 'notification',
      data: getUserPublicResponseData(authUser)
    });

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
