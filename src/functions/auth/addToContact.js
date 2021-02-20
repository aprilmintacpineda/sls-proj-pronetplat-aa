const { query } = require('faunadb');
const ContactRequest = require('dependencies/models/ContactRequest');
const User = require('dependencies/models/User');
const UserBlocking = require('dependencies/models/UserBlocking');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const {
  sendPushNotification
} = require('dependencies/utils/notifications');
const { hasCompletedSetup } = require('dependencies/utils/users');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody }) {
  if (formBody.contactId === authUser.id) {
    console.log('Cannot add self to contacts');
    return { statusCode: 400 };
  }

  const userBlocking = new UserBlocking();
  if (
    await userBlocking.wasBlocked(authUser.id, formBody.contactId)
  ) {
    console.log('User was blocked');
    return { statusCode: 400 };
  }

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
      body: JSON.stringify({
        pendingSentRequest,
        pendingReceivedRequest
      })
    };
  }

  try {
    await targetUser.getById(formBody.contactId);
  } catch (error) {
    console.log('error', error);
    return { statusCode: 400 };
  }

  if (!hasCompletedSetup(targetUser.data)) {
    console.log('Target not yet completed setup');
    return { statusCode: 400 };
  }

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
}

module.exports.handler = httpGuard({
  handler,
  guards: [
    guardTypes.auth,
    guardTypes.deviceToken,
    guardTypes.setupComplete
  ],
  formValidator: ({ contactId }) => validate(contactId, ['required'])
});
