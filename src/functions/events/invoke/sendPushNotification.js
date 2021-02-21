const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');
const {
  sendPushNotification
} = require('dependencies/utils/firebase');
const { hasTimePassed } = require('dependencies/utils/helpers');
const {
  getPublicUserData,
  getFullName,
  getPersonalPronoun
} = require('dependencies/utils/users');

module.exports.handler = async ({
  authUser,
  userId,
  data,
  body,
  title
}) => {
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

  await Promise.all([
    client.query(
      expiredTokenIds.map(registeredDeviceId => {
        return query.Delete(
          query.Ref(
            query.Collection('registeredDevices'),
            registeredDeviceId
          )
        );
      })
    ),
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
        ...getPublicUserData({
          ref: { id: authUser.id },
          data: authUser
        })
      }
    })
  ]);
};
