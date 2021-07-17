const AWS = require('aws-sdk');
const mimetypes = require('mime-types');

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4',
  useAccelerateEndpoint: true
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

module.exports.getSignedUrlPromise = async ({
  type,
  objectName: _objectName,
  objectKeyPrefix,
  objectNamePrefix
}) => {
  const ext = mimetypes.extension(type);
  const objectName = `${_objectName}.${ext}`;

  const signedUrl = await s3.getSignedUrlPromise('putObject', {
    Bucket: process.env.usersBucket,
    Expires: 300,
    ACL: 'private',
    Key: `${objectKeyPrefix}_${objectName}`,
    ContentType: type
  });

  return {
    signedUrl,
    url: `https://${process.env.usersBucket}.s3-accelerate.amazonaws.com/${objectNamePrefix}_${objectName}`
  };
};

module.exports.s3 = s3;
