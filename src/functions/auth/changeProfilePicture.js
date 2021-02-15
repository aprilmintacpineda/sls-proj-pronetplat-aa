const {
  checkRequiredHeaderValues
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const { s3 } = require('dependencies/nodejs/utils/s3');
const {
  throwIfNotCompletedSetup
} = require('dependencies/nodejs/utils/users');
const validate = require('dependencies/nodejs/utils/validate');

function hasErrors ({ mimeType }) {
  return validate(mimeType, [
    'required',
    'options:image/jpeg,image/png'
  ]);
}

module.exports.handler = async ({ headers }) => {
  try {
    const { authToken } = checkRequiredHeaderValues(headers);

    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('Invalid formBody');

    const { data: authUser } = await jwt.verify(authToken);

    throwIfNotCompletedSetup(authUser);

    const body = await s3.profilePictureUploadUrlPromise(
      authUser.id,
      formBody.mimeType
    );

    return {
      statusCode: 200,
      body: JSON.stringify(body)
    };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
