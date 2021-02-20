const User = require('dependencies/models/User');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const jwt = require('dependencies/utils/jwt');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody }) {
  const user = new User();
  await user.updateById(authUser.id, {
    firstName: formBody.firstName,
    middleName: formBody.middleName || '',
    surname: formBody.surname,
    gender: formBody.gender,
    jobTitle: formBody.jobTitle,
    company: formBody.company || '',
    bio: formBody.bio || ''
  });

  const userData = user.toResponseData();
  const authToken = await jwt.sign(userData);

  return {
    statusCode: 200,
    body: JSON.stringify({
      userData,
      authToken
    })
  };
}

module.exports.handler = httpGuard({
  handler,
  guards: [
    guardTypes.auth,
    guardTypes.deviceToken,
    guardTypes.emailVerified
  ],
  formValidator: ({
    firstName,
    middleName,
    surname,
    gender,
    jobTitle,
    company,
    bio
  }) => {
    return (
      validate(firstName, ['required', 'maxLength:255']) ||
      validate(middleName, ['maxLength:255']) ||
      validate(surname, ['required', 'maxLength:255']) ||
      validate(gender, ['required', 'options:male,female']) ||
      validate(jobTitle, ['required', 'maxLength:255']) ||
      validate(company, ['maxLength:255']) ||
      validate(bio, ['maxLength:255'])
    );
  }
});
