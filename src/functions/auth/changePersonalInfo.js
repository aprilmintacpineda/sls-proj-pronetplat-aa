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
  const headerValues = checkRequiredHeaderValues(headers);

  if (!headerValues) {
    console.log('Invalid headers');
    return { statusCode: 400 };
  }

  const formBody = JSON.parse(body);
  if (hasErrors(formBody)) {
    console.log('Invalid form body');
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

  if (!authUser.emailVerifiedAt) {
    console.log('Email not yet verified');
    return { statusCode: 403 };
  }

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
};
