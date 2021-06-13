const { initClient, create } = require('dependencies/utils/faunadb');
const {
  guardTypes,
  httpGuard
} = require('dependencies/utils/httpGuard');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody }) {
  const faunadb = initClient();

  const contactDetail = await faunadb.query(
    create('contactDetails', {
      userId: authUser.id,
      type: formBody.type,
      value: formBody.value,
      description: formBody.description,
      isCloseFriendsOnly: formBody.isCloseFriendsOnly
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      ...contactDetail.data,
      id: contactDetail.ref.id
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete],
  formValidator: ({
    type,
    value,
    description,
    isCloseFriendsOnly
  }) => {
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
      validate(isCloseFriendsOnly, ['required', 'bool']),
      validate(type, [
        'required',
        'options:mobile,telephone,website,email'
      ]) ||
        validate(value, valueValidationRules) ||
        validate(description, ['required', 'maxLength:100'])
    );
  }
});
