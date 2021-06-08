const {
  initClient,
  hardDeleteByIndex
} = require('dependencies/utils/faunadb');

module.exports = async ({ deviceToken, userId }) => {
  const faunadb = initClient();

  await faunadb.query(
    hardDeleteByIndex(
      'registeredDeviceByUserIdDeviceToken',
      userId,
      deviceToken
    )
  );
};
