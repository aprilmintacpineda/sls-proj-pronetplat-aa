const jimp = require('jimp');
const {
  getObjectPromise,
  uploadPromise
} = require('dependencies/nodejs/utils/s3');

module.exports.handler = async event => {
  try {
    console.log(JSON.stringify(event));
    const {
      bucket: { name: bucketName },
      object: { key: objectKey }
    } = event.Records[0].s3;

    const s3Object = await getObjectPromise({
      Bucket: bucketName,
      Key: objectKey
    });

    const image = await jimp.read(s3Object.Body);
    const resizedImage = await image
      .contain(100, 100)
      .quality(80)
      .getBufferAsync(image._originalMime);

    const uploaded = await uploadPromise({
      ACL: 'public-read',
      Key: objectKey,
      Bucket: bucketName,
      Body: resizedImage,
      ContentEncoding: s3Object.ContentEncoding,
      ContentType: s3Object.ContentType
    });

    console.log(uploaded);
  } catch (error) {
    console.log('error', error);
  }
};
