const jwt = require('/opt/nodejs/utils/jwt');
const { parseAuth } = require('/opt/nodejs/utils/helpers');
const { sendPushNotification } = require('/opt/nodejs/utils/notifications');
const User = require('/opt/nodejs/models/User');
const ContactRequest = require('/opt/nodejs/models/ContactRequest');
const Contact = require('/opt/nodejs/models/Contact');

module.exports.handler = async ({ pathParameters: { contactId }, headers }) => {
  try {
    const auth = await jwt.verify(parseAuth(headers));

    if (contactId === auth.data.id) throw new Error('Cannot add self to contacts');

    const user = new User();
    const targetUser = new User();

    await Promise.all([user.getById(auth.data.id), targetUser.getById(contactId)]);

    if (!targetUser.completedFirstSetupAt) throw new Error('Target user not setup.');

    const contact = new Contact();
    const contactRequest = new ContactRequest();

    await Promise.all([
      contact.create({
        ownerId: user.data.id,
        contactId: targetUser.data.id,
        status: 'pending'
      }),
      contactRequest.create({
        senderId: user.data.id,
        recipientId: targetUser.data.id
      })
    ]);

    let fullName = user.data.firstName;
    fullName += user.data.middleName ? ` ${user.data.middleName} ` : ' ';
    fullName += user.data.surname;

    const pronoun = user.data.gender === 'male' ? 'his' : 'her';

    await sendPushNotification({
      userId: targetUser.data.id,
      notification: {
        title: 'Contact request',
        body: `${fullName} wants to add you to ${pronoun} contacts.`
      },
      data: {
        type: 'contact_request'
      }
    });

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
