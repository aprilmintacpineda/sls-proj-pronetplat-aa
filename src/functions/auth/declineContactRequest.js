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

    const contactRequest = new ContactRequest();
    await contactRequest.getByIndex(
      'contactRequestBySenderIdRecipientId',
      formBody.senderId,
      authUser.id
    );

    const userBlocking = new UserBlocking();
    if (
      await userBlocking.wasBlocked(authUser.id, formBody.senderId)
    )
      throw new Error('User was blocked');

    const notification = new Notification();

    await Promise.all([
      contactRequest.hardDelete(),
      notification.create({
        userId: contactRequest.data.senderId,
        type: 'contactRequestDeclined',
        body: '{fullname} has declined your contact request.',
        actorId: authUser.id
      })
    ]);

    let fullName = authUser.firstName;
    fullName += authUser.middleName
      ? ` ${authUser.middleName} `
      : ' ';
    fullName += authUser.surname;

    await sendPushNotification({
      userId: contactRequest.data.senderId,
      imageUrl: authUser.profilePicture,
      title: 'Contact request declined',
      body: `${fullName} has declined your contact request.`,
      type: 'contactRequestDeclined',
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
