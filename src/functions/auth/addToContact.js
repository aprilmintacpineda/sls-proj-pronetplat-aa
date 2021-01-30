const { query } = require('faunadb');
const ContactRequest = require('dependencies/nodejs/models/ContactRequest');
const User = require('dependencies/nodejs/models/User');
const UserBlocking = require('dependencies/nodejs/models/UserBlocking');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const {
  sendPushNotification
} = require('dependencies/nodejs/utils/notifications');
const {
  getPersonalPronoun,
  getUserPublicResponseData,
  getFullName
} = require('dependencies/nodejs/utils/users');
const validate = require('dependencies/nodejs/utils/validate');

function hasErrors ({ contactId }) {
  return validate(contactId, ['required']);
}

module.exports.handler = async ({ body, headers }) => {
  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('Invalid form body');

    const { data: authUser } = await jwt.verify(
      getAuthTokenFromHeaders(headers)
    );

    if (formBody.contactId === authUser.id)
      throw new Error('Cannot add self to contacts');

    const userBlocking = new UserBlocking();
    if (
      await userBlocking.wasBlocked(authUser.id, formBody.contactId)
    )
      throw new Error('User was blocked');

    const user = new User();
    const targetUser = new User();
    const contactRequest = new ContactRequest();
    const [
      pendingReceivedRequest,
      pendingSentRequest
    ] = await Promise.all([
      contactRequest.hasPendingRequest({
        senderId: formBody.contactId,
        recipientId: authUser.id
      }),
      contactRequest.hasPendingRequest({
        senderId: authUser.id,
        recipientId: formBody.contactId
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

    await targetUser.getById(formBody.contactId);

    await Promise.all([user.getById(authUser.id)]);

    if (!targetUser.data.completedFirstSetupAt)
      throw new Error('Target user not setup.');

    await contactRequest.create({
      senderId: authUser.id,
      recipientId: targetUser.data.id,
      canFollowUpAt: query.Format(
        '%t',
        query.TimeAdd(query.Now(), 1, 'day')
      )
    });

    await sendPushNotification({
      userId: targetUser.data.id,
      imageUrl: authUser.profilePicture,
      title: 'Contact request',
      body: `${getFullName(authUser)} wants to add you to ${
        getPersonalPronoun(authUser).possessive.lowercase
      } contacts.`,
      type: 'contactRequest',
      category: 'contactRequest',
      data: getUserPublicResponseData(authUser)
    });

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
