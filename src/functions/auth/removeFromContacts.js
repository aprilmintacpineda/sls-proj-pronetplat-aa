const Contact = require('dependencies/models/Contact');
const {
  checkRequiredHeaderValues
} = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const { hasCompletedSetup } = require('dependencies/utils/users');
const validate = require('dependencies/utils/validate');

function hasErrors ({ contactId }) {
  return validate(contactId, ['required']);
}

module.exports.handler = async ({ body, headers }) => {
  const headerValues = checkRequiredHeaderValues(headers);

  if (!headerValues) {
    console.log('Invalid headers');
    return { statusCode: 400 };
  }

  const formBody = JSON.parse(body);
  if (hasErrors(formBody)) {
    console.log('invalid form body');
    return { statusCode: 400 };
  }

  let authUser;

  try {
    const token = await jwt.verify(headerValues.authToken);
    authUser = token.data;
  } catch (_1) {
    console.log('invalid token');
    return { statusCode: 401 };
  }

  if (!hasCompletedSetup(authUser)) {
    console.log('Not yet completed');
    return { statusCode: 400 };
  }

  const contact = new Contact();
  await contact.hardDeleteIfExists(
    'contactByOwnerContact',
    authUser.id,
    formBody.contactId
  );

  return { statusCode: 200 };
};
