const User = require('dependencies/models/User');
const {
  checkRequiredHeaderValues
} = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const validate = require('dependencies/utils/validate');

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
    const { authToken } = checkRequiredHeaderValues(headers);

    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('Invalid formBody');

    const { data: authUser } = await jwt.verify(authToken);

    if (!authUser.emailVerifiedAt)
      throw new Error('Email not yet verified');

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
    const newAuthToken = await jwt.sign(userData);

    return {
      statusCode: 200,
      body: JSON.stringify({
        userData,
        authToken: newAuthToken
      })
    };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
