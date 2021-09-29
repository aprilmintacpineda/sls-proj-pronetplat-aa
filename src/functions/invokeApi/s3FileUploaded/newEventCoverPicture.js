const jimp = require('jimp');
const {
  initClient,
  getById,
  update
} = require('dependencies/utils/faunadb');
const {
  getObjectPromise,
  uploadPromise
} = require('dependencies/utils/s3');

module.exports = async ({ bucketName, objectKey }) => {
  const uploadedS3Object = {
    Bucket: bucketName,
    Key: objectKey
  };

  const file = await getObjectPromise(uploadedS3Object);

  const image = await jimp.read(file.Body);
  const resizedImage = await image
    .contain(600, 300)
    .quality(70)
    .getBufferAsync(image._originalMime);

  const coverPicture = objectKey.replace(
    /newEventCoverPicture_/gim,
    'eventCoverPicture_'
  );

  const [, eventId] = objectKey.split('_');
  const faunadb = initClient();

  const event = await faunadb.query(getById('_events', eventId));

  const uploaded = await uploadPromise({
    ACL: 'public-read',
    Key: coverPicture,
    Bucket: bucketName,
    Body: resizedImage,
    ContentEncoding: file.ContentEncoding,
    ContentType: file.ContentType
  });

  await faunadb.query(
    update(event.ref, {
      coverPicture: uploaded.Location,
      status:
        event.data.status === 'creating'
          ? 'unpublished'
          : event.data.status
    })
  );
};
