const jwt = require('/opt/nodejs/utils/jwt');
const { parseAuth } = require('/opt/nodejs/utils/helpers');
const validate = require('/opt/nodejs/utils/validate');
const User = require('/opt/nodejs/models/User');

function hasErrors ({ firstName, middleName, surname, gender }) {
  return (
    validate(firstName, ['required', 'maxLength:255']) ||
    validate(middleName, ['maxLength:255']) ||
    validate(surname, ['required', 'maxLength:255']) ||
    validate(gender, ['required', 'options:male,female'])
  );
}

module.exports = async ({ headers, body }) => {
  try {
    const auth = await jwt.verify(parseAuth(headers));
    const user = new User();
    await user.getById(auth.data.id);
    const formBody = JSON.parse(body);

    if (hasErrors(formBody)) return { statusCode: 403 };

    const { firstName, middleName, surname, gender } = formBody;

    await user.update({
      firstName,
      middleName,
      surname,
      gender
    });

    const authUser = user.toResponseData();
    const authToken = jwt.sign(authUser);

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
