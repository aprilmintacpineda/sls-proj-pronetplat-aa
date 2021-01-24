const { query } = require('faunadb');
const User = require('dependencies/nodejs/models/User');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const validate = require('dependencies/nodejs/utils/validate');

function hasErrors ({
  firstName,
  middleName,
  surname,
  gender,
  jobTitle,
  company,
  bio
}) {
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

module.exports.handler = async ({ headers, body }) => {
  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('Invalid formBody');

    const { data: authUser } = await jwt.verify(
      getAuthTokenFromHeaders(headers)
    );

    const user = new User();

    await user.updateById(authUser.id, {
      firstName: formBody.firstName,
      middleName: formBody.middleName || '',
      surname: formBody.surname,
      gender: formBody.gender,
      jobTitle: formBody.jobTitle,
      company: formBody.company || '',
      bio: formBody.bio || '',
      completedFirstSetupAt: query.Format('%t', query.Now())
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
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
