const jwt = require('/opt/nodejs/utils/jwt');
const { parseAuth } = require('/opt/nodejs/utils/helpers');
const { sendPushNotification } = require('/opt/nodejs/utils/notifications');
const User = require('/opt/nodejs/models/User');
// const ContactRequest = require('/opt/nodejs/models/ContactRequest');
// const Contact = require('/opt/nodejs/models/Contact');

module.exports.handler = async ({ pathParameters: { contactId }, headers }) => {
  try {
    const auth = await jwt.verify(parseAuth(headers));

    if (contactId === auth.data.id) throw new Error('Cannot add self to contacts');

    const user = new User();
    const targetUser = new User();
    // const contact = new Contact();
    // const contactRequest = new ContactRequest();

    // if (
    //   await contactRequest.hasPendingRequest({
    //     from: contactId,
    //     to: auth.data.id
    //   }) ||
    //   await contactRequest.hasPendingRequest({
    //     from: auth.data.id,
    //     to: contactId
    //   })
    // )
    //   return { statusCode: 422 };

    await Promise.all([user.getById(auth.data.id), targetUser.getById(contactId)]);

    if (!targetUser.data.completedFirstSetupAt) throw new Error('Target user not setup.');

    // await Promise.all([
    //   contact.create({
    //     ownerId: user.data.id,
    //     contactId: targetUser.data.id,
    //     status: 'pending'
    //   }),
    //   contactRequest.create({
    //     senderId: user.data.id,
    //     recipientId: targetUser.data.id
    //   })
    // ]);

    const { profilePicture, firstName, middleName, surname } = user.data;

    let fullName = firstName;
    fullName += middleName ? ` ${middleName} ` : ' ';
    fullName += surname;

    const pronoun = user.data.gender === 'male' ? 'his' : 'her';

    await sendPushNotification({
      userId: targetUser.data.id,
      title: 'Contact request',
      body: `${fullName} wants to add you to ${pronoun} contacts.`,
      type: 'contact_request',
      data: {
        profilePicture,
        firstName,
        middleName,
        surname
      }
    });

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
