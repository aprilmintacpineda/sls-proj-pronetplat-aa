const Contact = require('dependencies/nodejs/models/Contact');
const UserBlocking = require('dependencies/nodejs/models/UserBlocking');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const { invokeEvent } = require('dependencies/nodejs/utils/lambda');
const validate = require('dependencies/nodejs/utils/validate');

function hasErrors ({ contactId }) {
  return validate(contactId, ['required']);
}

module.exports.handler = async ({ body, headers }) => {
  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('invalid form body');

    const { data: authUser } = await jwt.verify(
      getAuthTokenFromHeaders(headers)
    );

    const userBlocking = new UserBlocking();

    const [
      userHasBlockContact,
      contactHasBlockedUser
    ] = await Promise.all([
      userBlocking.countByIndex(
        'userBlockingsByBlockerIdUserId',
        authUser.id,
        formBody.contactId
      ),
      userBlocking.countByIndex(
        'userBlockingsByBlockerIdUserId',
        formBody.contactId,
        authUser.id
      )
    ]);

    if (userHasBlockContact) throw new Error('userHasBlockContact');
    if (contactHasBlockedUser)
      throw new Error('contactHasBlockedUser');

    await userBlocking.create({
      blockerId: authUser.id,
      userId: formBody.contactId
    });

    const contact = new Contact();

    await contact.hardDeleteIfExists(
      'contactByOwnerContact',
      authUser.id,
      formBody.contactId
    );

    await invokeEvent({
      functionName: process.env.fn_userBlocked,
      payload: {
        authUser,
        contactId: formBody.contactId
      }
    });

    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
