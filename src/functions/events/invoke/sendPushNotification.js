const { query } = require('faunadb');
const {
  initClient,
  hardDeleteByIndex
} = require('dependencies/utils/faunadb');
const {
  sendFirebaseNotification
} = require('dependencies/utils/firebase');
const { hasTimePassed } = require('dependencies/utils/helpers');
const {
  getFullName,
  getPersonalPronoun
} = require('dependencies/utils/users');

module.exports.handler = async ({
  authUser,
  userId,
  body,
  title
}) => {
  const faunadb = initClient();
  let after = null;
  const activeTokens = [];
  const expiredTokens = [];

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
      if (!hasTimePassed(expiresAt)) activeTokens.push(deviceToken);
      else expiredTokens.push(deviceToken);
    });

    after = result.after;
  } while (after);

  const fullname = getFullName(authUser);

  await Promise.all([
    sendFirebaseNotification({
      tokens: activeTokens,
      notification: {
        title: title.replace(/{fullname}/gim, fullname),
        imageUrl: authUser.profilePicture,
        body: body
          .replace(/{fullname}/gim, fullname)
          .replace(
            /{genderPossessiveLowercase}/gim,
            getPersonalPronoun(authUser).possessive.lowercase
          )
      }
    }),
    expiredTokens.length
      ? faunadb.query(
          expiredTokens.map(token =>
            hardDeleteByIndex(
              'registeredDeviceByUserIdDeviceToken',
              userId,
              token
            )
          )
        )
      : null
  ]);
};
