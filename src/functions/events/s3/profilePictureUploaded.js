const jimp = require('jimp');
const User = require('dependencies/nodejs/models/User');
const {
  getObjectPromise,
  uploadPromise,
  deleteObjectPromise
} = require('dependencies/nodejs/utils/s3');

module.exports.handler = async event => {
  try {
    const {
      bucket: { name: bucketName },
      object: { key: objectKey }
    } = event.Records[0].s3;

    const uploadedS3Object = {
      Bucket: bucketName,
      Key: objectKey
    };

    const file = await getObjectPromise(uploadedS3Object);

    const image = await jimp.read(file.Body);
    const resizedImage = await image
      .contain(100, 100)
      .quality(80)
      .getBufferAsync(image._originalMime);

    const profilePicture = objectKey.replace(
      /newProfilePicture_/gim,
      'profilePicture_'
    );

    await Promise.all([
      uploadPromise({
        ACL: 'public-read',
        Key: profilePicture,
        Bucket: bucketName,
        Body: resizedImage,
        ContentEncoding: file.ContentEncoding,
        ContentType: file.ContentType
      }),
      deleteObjectPromise(uploadedS3Object)
    ]);

    const [, userId] = objectKey.split('_');
    const user = new User();
    await user.updateById(userId, { profilePicture });
  } catch (error) {
    console.log('error', error);
  }
};
