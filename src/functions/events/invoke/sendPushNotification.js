const { query } = require('faunadb');
const RegisteredDevice = require('dependencies/models/RegisteredDevice');
const { initClient } = require('dependencies/utils/faunadb');
const {
  sendPushNotification
} = require('dependencies/utils/firebase');
const { hasTimePassed } = require('dependencies/utils/helpers');
const {
  getUserPublicResponseData,
  getFullName,
  getPersonalPronoun
} = require('dependencies/utils/users');

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
        if (hasTimePassed(expiresAt)) expiredTokenIds.push(ref.id);
        else tokens.push(deviceToken);
      }, []);

      after = result.after;
    } while (after);

    await Promise.all(
      expiredTokenIds
        .map(registeredDeviceId =>
          deleteExpiredToken(registeredDeviceId)
        )
        .concat(
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
          })
        )
    );
  } catch (error) {
    console.log('error', error);
  }
};
