const AWS = require('aws-sdk');

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

module.exports.s3 = s3;
