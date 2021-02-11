const { query } = require('faunadb');
const RegisteredDevice = require('dependencies/nodejs/models/RegisteredDevice');
const { initClient } = require('dependencies/nodejs/utils/faunadb');
const {
  sendPushNotification
} = require('dependencies/nodejs/utils/firebase');
const {
  hasTimePassed
} = require('dependencies/nodejs/utils/helpers');
const {
  getUserPublicResponseData,
  getFullName,
  getPersonalPronoun
} = require('dependencies/nodejs/utils/users');

function deleteExpiredToken (id) {
  const registeredDevice = new RegisteredDevice();
  return registeredDevice.hardDeleteById(id);
}

module.exports.handler = async ({
  authUser,
  userId,
  data,
  body,
  title
}) => {
  try {
    const client = initClient();
    let after = null;
    const tokens = [];
    const expiredTokenIds = [];

    do {
      const result = await client.query(
        query.Paginate(
          query.Match(
            query.Index('registeredDevicesByUserId'),
            userId
          ),
          {
            size: 20,
            after: after || []
          }
        )
      );

      result.data.forEach(([expiresAt, deviceToken, _1, ref]) => {
        if (!hasTimePassed(expiresAt)) tokens.push(deviceToken);
        else expiredTokenIds.push(ref.id);
      }, []);

      after = result.after;
    } while (after);

    await Promise.all([
      sendPushNotification({
        tokens,
        notification: {
          title,
          imageUrl: authUser.profilePicture,
          body: body
            .replace(/{fullname}/gim, getFullName(authUser))
            .replace(
              /{genderPossessiveLowercase}/gim,
              getPersonalPronoun(authUser).possessive.lowercase
            )
        },
        data: {
          ...data,
          ...getUserPublicResponseData(authUser)
        }
      }),
      expiredTokenIds.map(registeredDeviceId =>
        deleteExpiredToken(registeredDeviceId)
      )
    ]);
  } catch (error) {
    console.log('error', error);
  }
};
