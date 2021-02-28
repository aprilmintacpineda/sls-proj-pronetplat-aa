const {
  initClient,
  getById,
  updateIfOwnedByUser
} = require('dependencies/utils/faunadb');
const {
  guardTypes,
  httpGuard
} = require('dependencies/utils/guards');
const validate = require('dependencies/utils/validate');

async function handler ({
  authUser,
  params: { contactDetailId },
  formBody
}) {
  const faunadb = initClient();

  const contactDetail = await faunadb.query(
    updateIfOwnedByUser(
      authUser.id,
      getById('contactDetails', contactDetailId),
      {
        type: formBody.type,
        value: formBody.value,
        description: formBody.description
      }
    )
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      ...contactDetail.data,
      id: contactDetail.ref.id
    })
  };
}

module.exports.handler = httpGuard({
  handler,
  guards: [
    guardTypes.auth,
    guardTypes.deviceToken,
    guardTypes.setupComplete
  ],
  formValidator: ({ type, value, description }) => {
    let valueValidationRules = false;

    switch (type) {
      case 'email':
        valueValidationRules = ['required', 'email'];
        break;
      case 'website':
        valueValidationRules = ['required', 'url'];
        break;
      default:
        valueValidationRules = [
          'required',
          'maxLength:255',
          'contactOther'
        ];
        break;
    }

    return (
      validate(type, [
        'required',
        'options:mobile,telephone,website,email'
      ]) ||
      validate(value, valueValidationRules) ||
      validate(description, ['required', 'maxLength:100'])
    );
  }
});
