const AWS = require('aws-sdk');
const mimetypes = require('mime-types');
const { randomNum } = require('./helpers');

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4'
});

module.exports.getObjectPromise = params => {
  return new Promise((resolve, reject) => {
    s3.getObject(params, (error, data) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
};

module.exports.deleteObjectPromise = params => {
  return new Promise((resolve, reject) => {
    s3.deleteObject(params, (error, data) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
};

module.exports.uploadPromise = params => {
  return new Promise((resolve, reject) => {
    s3.upload(params, (error, data) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
};

module.exports.profilePictureUploadUrlPromise = (userId, mime) => {
  return new Promise((resolve, reject) => {
    const ext = mimetypes.extension(mime);
    const objectName = `${userId}_${randomNum()}.${ext}`;
    const bucketName = process.env.usersBucket;
    const key = `newProfilePicture_${objectName}`;

    const params = {
      Bucket: bucketName,
      Expires: 10,
      Fields: {
        key,
        acl: 'private'
      },
      Conditions: [
        ['bucket', bucketName],
        ['content-length-range', 1024, 5242880],
        ['eq', '$acl', 'private'],
        ['eq', '$key', key],
        ['starts-with', '$Content-Type', 'image/']
      ]
    };

    s3.createPresignedPost(params, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve({
          signedUrl: data.url,
          profilePicture: `https://${bucketName}.s3-ap-southeast-1.amazonaws.com/profilePicture_${objectName}`
        });
      }
    });
  });
};

module.exports.s3 = s3;
