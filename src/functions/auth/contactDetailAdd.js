const { initClient, create } = require('dependencies/utils/faunadb');
const {
  guardTypes,
  httpGuard
} = require('dependencies/utils/guards');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody }) {
  const faunadb = initClient();

  const contactDetail = await faunadb.query(
    create('contactDetails', {
      userId: authUser.id,
      type: formBody.type,
      value: formBody.value,
      description: formBody.description
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

module.exports.handler = httpGuard({
  handler,
  guards: [
    guardTypes.auth,
    guardTypes.deviceToken,
    guardTypes.setupComplete
  ],
  formValidator: ({ type, value, description }) => {
    let valueInvalid = false;

    switch (type) {
      case 'email':
        valueInvalid = validate(value, ['required', 'email']);
        break;
      case 'website':
        valueInvalid = validate(value, ['required', 'url']);
        break;
      default:
        valueInvalid = validate(value, [
          'required',
          'maxLength:255',
          'contactOther'
        ]);
        break;
    }

    return (
      valueInvalid ||
      validate(type, [
        'required',
        'options:mobile,telephone,website,email'
      ]) ||
      validate(value, ['required', 'maxLength:255']) ||
      validate(description, ['required', 'maxLength:150'])
    );
  }
});
