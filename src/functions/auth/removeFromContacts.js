const Contact = require('dependencies/models/Contact');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody }) {
  const contact = new Contact();

  await contact.hardDeleteIfExists(
    'contactByOwnerContact',
    authUser.id,
    formBody.contactId
  );

  return { statusCode: 200 };
}

module.exports.handler = httpGuard({
  handler,
  guards: [
    guardTypes.auth,
    guardTypes.deviceToken,
    guardTypes.setupComplete
  ],
  formValidator: ({ contactId }) => validate(contactId, ['required'])
});
