const jwt = require('/opt/nodejs/utils/jwt');
const { parseAuth } = require('/opt/nodejs/utils/helpers');
const { sendPushNotification } = require('/opt/nodejs/utils/notifications');
const User = require('/opt/nodejs/models/User');
const NetworkRequest = require('/opt/nodejs/models/NetworkRequest');
const Contact = require('/opt/nodejs/models/Contact');

module.exports.handler = async ({ pathParameters: { contactId }, headers }) => {
  try {
    const auth = await jwt.verify(parseAuth(headers));

    if (contactId === auth.data.id) throw new Error('Cannot add self to contacts');

    const user = new User();
    const targetUser = new User();

    await Promise.all([user.getById(auth.data.id), targetUser.getById(contactId)]);

    const contact = new Contact();
    const networkRequest = new NetworkRequest();

    await Promise.all([
      contact.create({
        ownerId: user.data.id,
        contactId: targetUser.data.id,
        status: 'pending'
      }),
      networkRequest.create({
        senderId: user.data.id,
        recipientId: targetUser.data.id
      })
    ]);

    let fullName = user.data.firstName;
    fullName += user.data.middleName ? ` ${user.data.middleName} ` : ' ';
    fullName += user.data.surname;

    await sendPushNotification({
      userId: targetUser.data.id,
      notification: {
        title: 'Connection request',
        body: `${fullName} wants to network with you.`
      },
      data: {
        type: 'network_request'
      }
    });

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
