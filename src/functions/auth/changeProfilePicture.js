const AWS = require('aws-sdk');

const jwt = require('/opt/nodejs/utils/jwt');
const { parseAuth } = require('/opt/nodejs/utils/helpers');
const validate = require('/opt/nodejs/utils/validate');
const User = require('/opt/nodejs/models/User');

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

function hasErrors ({ mimeType }) {
  return validate(mimeType, ['required', 'options:image/jpeg,image/png']);
}

module.exports.handler = async ({ headers, body }) => {
  try {
    const auth = await jwt.verify(parseAuth(headers));
    const user = new User();
    await user.getById(auth.data.id);
    const formBody = JSON.parse(body);

    if (hasErrors(formBody)) return '';

    const presignedUrl = await new Promise((resolve, reject) => {
      s3.getSignedUrl(
        'putObject',
        {
          Bucket: process.env.USERS_BUCKET,
          Expires: 15,
          ACL: 'public-read',
          key: `profilePictures/${user.data.id}`,
          ContentType: formBody.mimeType
        },
        (error, data) => {
          if (error) reject(error);
          resolve(data);
        }
      );
    });

    console.log(presignedUrl);

    // return {
    //   statusCode: 200,
    //   body: JSON.stringify({})
    // };
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
