const jimp = require('jimp');
const {
  getObjectPromise,
  uploadPromise,
  deleteObjectPromise
} = require('dependencies/nodejs/utils/s3');

module.exports.handler = async event => {
  try {
    console.log(JSON.stringify(event));
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

    await Promise.all([
      uploadPromise({
        ACL: 'public-read',
        Key: objectKey.replace(
          /newProfilePicture_/gim,
          'profilePicture_'
        ),
        Bucket: bucketName,
        Body: resizedImage,
        ContentEncoding: file.ContentEncoding,
        ContentType: file.ContentType
      }),
      deleteObjectPromise(uploadedS3Object)
    ]);
  } catch (error) {
    console.log('error', error);
  }
};
