const jwt = require('/opt/nodejs/utils/jwt');
const { parseAuth } = require('/opt/nodejs/utils/helpers');
const User = require('/opt/nodejs/models/User');
const NetworkRequest = require('/opt/nodejs/models/NetworkRequest');
const Contact = require('/opt/nodejs/models/Contact');

module.exports.handler = async ({ pathParameters: { contactId }, headers }) => {
  try {
    const auth = await jwt.verify(parseAuth(headers));
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

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};