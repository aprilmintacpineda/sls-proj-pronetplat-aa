const ContactRequest = require('dependencies/nodejs/models/ContactRequest');
const Notification = require('dependencies/nodejs/models/Notification');
const UserBlocking = require('dependencies/nodejs/models/UserBlocking');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const {
  sendPushNotification
} = require('dependencies/nodejs/utils/notifications');
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

    const sentContactRequest = new ContactRequest();
    await sentContactRequest.getByIndex(
      'contactRequestBySenderIdRecipientId',
      authUser.id,
      formBody.contactId
    );

    const userBlocking = new UserBlocking();
    if (
      await userBlocking.wasBlocked(authUser.id, formBody.contactId)
    )
      throw new Error('User was blocked');

    const notification = new Notification();
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

    let fullName = authUser.firstName;
    fullName += authUser.middleName
      ? ` ${authUser.middleName} `
      : ' ';
    fullName += authUser.surname;

    await sendPushNotification({
      userId: sentContactRequest.data.recipientId,
      imageUrl: authUser.profilePicture,
      title: 'Contact request cancelled',
      body: `${fullName} has cancelled ${pronoun} contact request.`,
      type: 'contactRequestCancelled',
      category: 'notification',
      data: {
        id: authUser.id,
        profilePicture: authUser.profilePicture,
        firstName: authUser.firstName,
        middleName: authUser.middleName,
        surname: authUser.surname,
        bio: authUser.bio,
        company: authUser.company,
        jobTitle: authUser.jobTitle
      }
    });

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
