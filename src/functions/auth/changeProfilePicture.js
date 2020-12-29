const AWS = require('aws-sdk');

const jwt = require('/opt/nodejs/utils/jwt');
const { parseAuth } = require('/opt/nodejs/utils/helpers');
const User = require('/opt/nodejs/models/User');

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

module.exports.handler = async ({ headers }) => {
  try {
    const auth = await jwt.verify(parseAuth(headers));
    const user = new User(auth.data.id);
    await user.getById();

    console.log(process.env);

    const presignedUrl = new Promise((resolve, reject) => {
      s3.createPresignedPost(
        {
          Bucket: 'proj-pronetplat-users-dev',
          Fields: {
            key: `profilePictures/${user.data.id}`
          }
        },
        (error, data) => {
          if (error) reject(error);
          resolve(data);
        }
      );
    });

    console.log('presignedUrl', presignedUrl);
  } catch (error) {
    console.log('error', error);
  }

  return { statusCode: 403 };
};
