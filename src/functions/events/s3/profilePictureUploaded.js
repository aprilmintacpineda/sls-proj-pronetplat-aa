const jimp = require('jimp');
const {
  initClient,
  getById,
  update
} = require('dependencies/utils/faunadb');
const {
  getObjectPromise,
  uploadPromise,
  deleteObjectPromise
} = require('dependencies/utils/s3');

module.exports.handler = async event => {
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
    .contain(160, 160)
    .quality(70)
    .getBufferAsync(image._originalMime);

  const profilePicture = objectKey.replace(
    /newProfilePicture_/gim,
    'profilePicture_'
  );

  const [, userId] = objectKey.split('_');
  const faunadb = initClient();

  const user = await faunadb.query(getById('users', userId));

  const [uploaded] = await Promise.all([
    uploadPromise({
      ACL: 'public-read',
      Key: profilePicture,
      Bucket: bucketName,
      Body: resizedImage,
      ContentEncoding: file.ContentEncoding,
      ContentType: file.ContentType
    }),
    deleteObjectPromise(uploadedS3Object),
    deleteObjectPromise({
      Bucket: bucketName,
      Key: user.data.profilePicture.split('/').reverse()[0]
    })
  ]);

  await faunadb.query(
    update(user.ref, {
      profilePicture: uploaded.Location
    })
  );
};
