const {
  initClient,
  updateById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const jwt = require('dependencies/utils/jwt');
const { getUserData } = require('dependencies/utils/users');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody }) {
  const faunadb = initClient();

  const user = await faunadb.query(
    updateById('users', authUser.id, {
      firstName: formBody.firstName,
      middleName: formBody.middleName || '',
      surname: formBody.surname,
      gender: formBody.gender,
      jobTitle: formBody.jobTitle,
      company: formBody.company || '',
      bio: formBody.bio || ''
    })
  );

  const userData = getUserData(user);
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
  guards: [guardTypes.auth, guardTypes.emailVerified],
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
      validate(firstName, ['required', 'maxLength:35']) ||
      validate(middleName, ['maxLength:35']) ||
      validate(surname, ['required', 'maxLength:35']) ||
      validate(gender, ['required', 'options:male,female']) ||
      validate(jobTitle, ['required', 'maxLength:255']) ||
      validate(company, ['maxLength:70']) ||
      validate(bio, ['maxLength:255'])
    );
  }
});
