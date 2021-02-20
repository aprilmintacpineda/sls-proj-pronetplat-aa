const Contact = require('dependencies/models/Contact');
const ContactRequest = require('dependencies/models/ContactRequest');
const User = require('dependencies/models/User');
const UserBlocking = require('dependencies/models/UserBlocking');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const { hasCompletedSetup } = require('dependencies/utils/users');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody }) {
  const userBlocking = new UserBlocking();
  const contactRequest = new ContactRequest();
  const targetUser = new User();

  const [
    userHasBlockContact,
    contactHasBlockedUser,
    hasReceivedContactRequest,
    hasSentContactRequest
  ] = await Promise.all([
    userBlocking.wasBlocked(authUser.id, formBody.contactId),
    userBlocking.wasBlocked(formBody.contactId, authUser.id),
    contactRequest.hasPendingRequest({
      senderId: formBody.contactId,
      recipientId: authUser.id
    }),
    contactRequest.hasPendingRequest({
      senderId: authUser.id,
      recipientId: formBody.contactId
    }),
    targetUser.getById(formBody.contactId)
  ]);

  const targetHasCompletedSetup = !hasCompletedSetup(
    targetUser.data
  );

  if (
    userHasBlockContact ||
    contactHasBlockedUser ||
    hasReceivedContactRequest ||
    hasSentContactRequest ||
    !targetHasCompletedSetup
  ) {
    console.log('userHasBlockContact', userHasBlockContact);
    console.log('contactHasBlockedUser', contactHasBlockedUser);
    console.log(
      'hasReceivedContactRequest',
      hasReceivedContactRequest
    );
    console.log('hasSentContactRequest', hasSentContactRequest);
    console.log('targetHasCompletedSetup', targetHasCompletedSetup);

    return { statusCode: 400 };
  }

  const contact = new Contact();

  await Promise.all([
    userBlocking.create({
      blockerId: authUser.id,
      userId: formBody.contactId
    }),
    contact.hardDeleteIfExists(
      'contactByOwnerContact',
      authUser.id,
      formBody.contactId
    )
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
