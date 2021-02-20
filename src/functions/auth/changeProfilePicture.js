const mimetypes = require('mime-types');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const { randomNum } = require('dependencies/utils/helpers');
const { s3 } = require('dependencies/utils/s3');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody }) {
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
}

module.exports.handler = httpGuard({
  handler,
  guards: [
    guardTypes.auth,
    guardTypes.deviceToken,
    guardTypes.setupComplete
  ],
  formValidator: ({ type }) => {
    return validate(type, [
      'required',
      'options:image/jpeg,image/png'
    ]);
  }
});
