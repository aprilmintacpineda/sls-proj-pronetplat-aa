// used when handling native events from aws like s3
// and deriving the payload from the event itself

module.exports = {
  'ObjectCreated:Put': event => {
    const {
      bucket: { name: bucketName },
      object: { key: objectKey }
    } = event.Records[0].s3;

    return {
      bucketName,
      objectKey
    };
  }
};
