const mimetypes = require('mime-types');
const {
  randomNum,
  checkRequiredHeaderValues
} = require('dependencies/utils/helpers');
const jwt = require('dependencies/utils/jwt');
const { s3 } = require('dependencies/utils/s3');
const { hasCompletedSetup } = require('dependencies/utils/users');
const validate = require('dependencies/utils/validate');

function hasErrors ({ type }) {
  return validate(type, [
    'required',
    'options:image/jpeg,image/png'
  ]);
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
  } catch (error) {
    console.log('invalid token');
    return { statusCode: 401 };
  }

  if (!hasCompletedSetup(authUser)) {
    console.log('Not yet setup');
    return { statusCode: 403 };
  }

  const ext = mimetypes.extension(formBody.type);
  const objectName = `${authUser.id}_${randomNum()}.${ext}`;

  const signedUrl = await s3.getSignedUrlPromise('putObject', {
    Bucket: process.env.usersBucket,
    Expires: 10,
    ACL: 'private',
    Key: `newProfilePicture_${objectName}`,
    ContentType: formBody.type
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      signedUrl,
      profilePicture: `https://${process.env.usersBucket}.s3-accelerate.amazonaws.com/profilePicture_${objectName}`
    })
  };
};
