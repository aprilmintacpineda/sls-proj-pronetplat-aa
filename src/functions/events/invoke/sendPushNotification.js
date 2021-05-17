const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');
const {
  sendFirebaseNotification
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
  const faunadb = initClient();
  let after = null;
  const tokens = [];

  do {
    const result = await faunadb.query(
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

    result.data.forEach(([expiresAt, deviceToken]) => {
      if (!hasTimePassed(expiresAt)) tokens.push(deviceToken);
    });

    after = result.after;
  } while (after);

  const authUserData = getPublicUserData({
    ref: { id: authUser.id },
    data: authUser
  });

  await Promise.all([
    sendFirebaseNotification({
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
        ...authUserData
      }
    })
  ]);
};
