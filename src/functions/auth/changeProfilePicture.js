const aws = require('aws-sdk');
const mimetypes = require('mime-types');
const {
  getAuthTokenFromHeaders
} = require('dependencies/nodejs/utils/helpers');
const jwt = require('dependencies/nodejs/utils/jwt');
const validate = require('dependencies/nodejs/utils/validate');

const s3 = new aws.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4'
});

function hasErrors ({ mimeType }) {
  return validate(mimeType, [
    'required',
    'options:image/jpeg,image/png'
  ]);
}

module.exports.handler = async ({ headers, body }) => {
  try {
    const {
      data: { id }
    } = await jwt.verify(getAuthTokenFromHeaders(headers));
    const formBody = JSON.parse(body);

    if (hasErrors(formBody)) throw new Error('Invalid formBody');

    const { mimeType } = formBody;
    const ext = mimetypes.extension(mimeType);

    const signedUrl = await s3.getSignedUrlPromise('putObject', {
      Bucket: process.env.usersBucket,
      Expires: 15,
      ACL: 'public-read',
      Key: `newProfilePicture_${id}.${ext}`,
      ContentType: mimeType
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        signedUrl
      })
    };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
