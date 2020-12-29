const { query } = require('faunadb');
const validate = require('/opt/nodejs/utils/validate');
const jwt = require('/opt/nodejs/utils/jwt');
const { verifyHash } = require('/opt/nodejs/utils/helpers');
const User = require('/opt/nodejs/models/User');

function hasErrors ({ email, password }) {
  return (
    validate(email, ['required', 'email']) ||
    validate(password, ['required', 'maxLength:30'])
  );
}

module.exports.handler = async event => {
  console.log(JSON.stringify(body, null, 2));

  const { body } = event;
  const formBody = JSON.parse(body);
  if (hasErrors(formBody)) return { statusCode: 403 };

  try {
    const { email, password } = formBody;
    const user = new User();
    await user.getByEmail(email);

    if (!await verifyHash(password, user.data.hashedPassword))
      throw new Error('Incorrect password');

    await user.update({ lastLoginAt: query.Now() });
    const authUser = user.toResponseData();
    const authToken = await jwt.sign(authUser);

    return {
      statusCode: 200,
      body: JSON.stringify({
        authToken,
        authUser
      })
    };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
