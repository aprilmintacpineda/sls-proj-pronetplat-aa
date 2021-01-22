const ContactRequest = require('dependencies/nodejs/models/ContactRequest');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const validate = require('dependencies/nodejs/utils/validate');

function hasError ({ contactRequestId }) {
  return validate(contactRequestId, ['required']);
}

module.exports = async ({ body, headers }) => {
  try {
    const formBody = JSON.parse(body);
    if (hasError(formBody)) throw new Error('Invalid form body');

    const { contactId } = formBody;

    const {
      data: { id }
    } = await jwt.verify(getAuthTokenFromHeaders(headers));

    const sentContactRequest = new ContactRequest();
    await sentContactRequest.getByIndex(
      'contactRequestBySenderIdRecipientId',
      id,
      contactId
    );

    await sentContactRequest.hardDelete();
    return { statusCode: 200 };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
