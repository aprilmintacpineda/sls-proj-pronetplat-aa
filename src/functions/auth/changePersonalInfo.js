const { query } = require('faunadb');

const jwt = require('/opt/nodejs/utils/jwt');
const { parseAuth } = require('/opt/nodejs/utils/helpers');
const validate = require('/opt/nodejs/utils/validate');
const User = require('/opt/nodejs/models/User');

function hasErrors ({ firstName, middleName, surname, gender, jobTitle, company }) {
  return (
    validate(firstName, ['required', 'maxLength:255']) ||
    validate(middleName, ['maxLength:255']) ||
    validate(surname, ['required', 'maxLength:255']) ||
    validate(gender, ['required', 'options:male,female']) ||
    validate(jobTitle, ['required', 'maxLength:255']) ||
    validate(company, ['maxLength:255'])
  );
}

module.exports.handler = async ({ headers, body }) => {
  try {
    const auth = await jwt.verify(parseAuth(headers));
    const user = new User();
    await user.getById(auth.data.id);
    const formBody = JSON.parse(body);

    if (hasErrors(formBody)) throw new Error('Invalid formBody');

    const { firstName, middleName, surname, gender, jobTitle, company } = formBody;

    await user.update({
      firstName,
      middleName: middleName || '',
      surname,
      gender,
      jobTitle,
      company: company || '',
      completedFirstSetupAt: query.Now()
    });

    const authUser = user.toResponseData();
    const authToken = await jwt.sign(authUser);

    return {
      statusCode: 200,
      body: JSON.stringify({
        authUser,
        authToken
      })
    };
  } catch (error) {
    console.log(error);
  }

  return { statusCode: 403 };
};
