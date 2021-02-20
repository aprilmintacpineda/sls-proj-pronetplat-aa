const Contact = require('dependencies/models/Contact');
const ContactRequest = require('dependencies/models/ContactRequest');
const UserBlocking = require('dependencies/models/UserBlocking');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const { invokeEvent } = require('dependencies/utils/lambda');

async function handler ({ pathParameters: { contactId }, authUser }) {
  const contactBlocked = new UserBlocking();
  const blockedByUser = new UserBlocking();
  const receivedContactRequest = new ContactRequest();
  const sentContactRequest = new ContactRequest();
  const contact = new Contact();

  const [wasContactBlocked, wasBlockedByUser] = await Promise.all([
    contactBlocked.exists(
      'userBlockingsByBlockerIdUserId',
      authUser.id,
      contactId
    ),
    blockedByUser.exists(
      'userBlockingsByBlockerIdUserId',
      contactId,
      authUser.id
    ),
    receivedContactRequest.getPendingRequestIfExists({
      senderId: contactId,
      recipientId: authUser.id
    }),
    sentContactRequest.getPendingRequestIfExists({
      senderId: authUser.id,
      recipientId: contactId
    }),
    contact.getByIndexIfExists(
      'contactByOwnerContact',
      authUser.id,
      contactId
    )
  ]);

  if (
    wasContactBlocked ||
    wasBlockedByUser ||
    receivedContactRequest.instance ||
    sentContactRequest.instance
  ) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          contactBlocked: wasContactBlocked,
          blockedByUser: wasBlockedByUser,
          receivedContactRequest: receivedContactRequest.toResponseData(),
          sentContactRequest: sentContactRequest.toResponseData()
        }
      })
    };
  }

  if (!contact.instance) return { statusCode: 404 };

  await invokeEvent({
    functionName: process.env.fn_incrementNumTimesOpened,
    payload: {
      id: contact.data.id
    }
  });

  // @TODO: get contact details and send back
  return { statusCode: 403 };
}

module.exports.handler = httpGuard({
  handler,
  guards: [
    guardTypes.auth,
    guardTypes.deviceToken,
    guardTypes.setupComplete
  ]
});
