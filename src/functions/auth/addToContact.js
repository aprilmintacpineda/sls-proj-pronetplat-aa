const { query } = require('faunadb');
const ContactRequest = require('dependencies/models/ContactRequest');
const User = require('dependencies/models/User');
const UserBlocking = require('dependencies/models/UserBlocking');
const {
  checkRequiredHeaderValues
} = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const {
  sendPushNotification
} = require('dependencies/utils/notifications');
const {
  throwIfNotCompletedSetup
} = require('dependencies/utils/users');
const validate = require('dependencies/utils/validate');

function hasErrors ({ contactId }) {
  return validate(contactId, ['required']);
}

module.exports.handler = async ({ body, headers }) => {
  try {
    const { authToken } = checkRequiredHeaderValues(headers);

    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('Invalid form body');

    const { data: authUser } = await jwt.verify(authToken);

    throwIfNotCompletedSetup(authUser);

    if (formBody.contactId === authUser.id)
      throw new Error('Cannot add self to contacts');

    const userBlocking = new UserBlocking();
    if (
      await userBlocking.wasBlocked(authUser.id, formBody.contactId)
    )
      throw new Error('User was blocked');

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

    if (pendingSentRequest) {
      return {
        statusCode: 422,
        body: 'pendingSentRequest'
      };
    } else if (pendingReceivedRequest) {
      return {
        statusCode: 422,
        body: 'pendingReceivedRequest'
      };
    }

    await targetUser.getById(formBody.contactId);
    throwIfNotCompletedSetup(targetUser.data);

    await Promise.all([
      contactRequest.create({
        senderId: authUser.id,
        recipientId: targetUser.data.id,
        canFollowUpAt: query.Format(
          '%t',
          query.TimeAdd(query.Now(), 1, 'day')
        )
      }),
      sendPushNotification({
        userId: targetUser.data.id,
        title: 'Contact request',
        body:
          '{fullname} wants to add you to {genderPossessiveLowercase} contacts.',
        type: 'contactRequest',
        category: 'contactRequest',
        authUser
      })
    ]);

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
