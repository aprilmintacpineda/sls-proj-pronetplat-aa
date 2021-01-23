const { differenceInDays } = require('date-fns');
const { query } = require('faunadb');
const ContactRequest = require('dependencies/nodejs/models/ContactRequest');
const Notification = require('dependencies/nodejs/models/Notification');
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

module.exports.handler = async ({ headers, body }) => {
  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('Invalid form body');

    const { contactId } = formBody;

    const { data: authUser } = await jwt.verify(
      getAuthTokenFromHeaders(headers)
    );

    const contactRequest = new ContactRequest();
    await contactRequest.getByIndex(
      'contactRequestBySenderIdRecipientId',
      authUser.id,
      contactId
    );

    if (
      (!contactRequest.data.lastFollowUpAt &&
        differenceInDays(
          new Date(),
          new Date(contactRequest.data.createdAt)
        ) < 1) ||
      (contactRequest.data.lastFollowUpAt &&
        differenceInDays(
          new Date(),
          new Date(contactRequest.data.lastFollowUpAt)
        ) < 1)
    )
      throw new Error('Must wait until tomorrow to send follow up');

    const notification = new Notification();

    await Promise.all([
      notification.create({
        userId: contactRequest.data.recipientId,
        type: 'contactRequestFollowUp',
        body: '{fullname} followed up with his contact request',
        actorId: authUser.id
      }),
      contactRequest.update({
        lastFollowUpAt: query.Format('%t', query.Now())
      })
    ]);

    let fullName = authUser.firstName;
    fullName += authUser.middleName
      ? ` ${authUser.middleName} `
      : ' ';
    fullName += authUser.surname;

    await sendPushNotification({
      userId: contactRequest.data.recipientId,
      imageUrl: authUser.profilePicture,
      title: 'Contact request',
      body: `${fullName} followed up with his contact request`,
      type: 'contactRequestFollowUp',
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
