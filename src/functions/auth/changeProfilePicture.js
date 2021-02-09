const mimetypes = require('mime-types');
const {
  getAuthTokenFromHeaders,
  randomNum
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

module.exports.handler = async ({ headers, body }) => {
  try {
    const formBody = JSON.parse(body);
    if (hasErrors(formBody)) throw new Error('Invalid formBody');

    const { data: authUser } = await jwt.verify(
      getAuthTokenFromHeaders(headers)
    );

    throwIfNotCompletedSetup(authUser);

    const ext = mimetypes.extension(formBody.mimeType);
    const objectName = `profilePicture_${
      authUser.id
    }_${randomNum()}.${ext}`;

    const signedUrl = await s3.getSignedUrlPromise('putObject', {
      Bucket: process.env.usersBucket,
      Expires: 15,
      ACL: 'private',
      Key: objectName,
      ContentType: formBody.mimeType
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        signedUrl,
        profilePicture: `https://${process.env.usersBucket}.s3.ap-southeast-1.amazonaws.com/${objectName}`
      })
    };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
