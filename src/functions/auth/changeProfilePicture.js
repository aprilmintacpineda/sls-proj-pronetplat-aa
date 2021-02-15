const {
  checkRequiredHeaderValues
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const {
  profilePictureUploadUrlPromise
} = require('dependencies/nodejs/utils/s3');
const {
  throwIfNotCompletedSetup
} = require('dependencies/nodejs/utils/users');
const validate = require('dependencies/nodejs/utils/validate');

function hasErrors ({ type }) {
  return validate(type, [
    'required',
    'options:image/jpeg,image/png'
  ]);
}

module.exports.handler = async ({ headers, body }) => {
  try {
    const { authToken } = checkRequiredHeaderValues(headers);

    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('Invalid formBody');

    const { data: authUser } = await jwt.verify(authToken);

    throwIfNotCompletedSetup(authUser);

    const uploadUrls = await profilePictureUploadUrlPromise(
      authUser.id,
      formBody.type
    );

    return {
      statusCode: 200,
      body: JSON.stringify(uploadUrls)
    };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
