const { query } = require('faunadb');
const { initClient } = require('dependencies/utils/faunadb');
const {
  sendFirebaseNotification,
  isValidDeviceToken
} = require('dependencies/utils/firebase');
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
  let allTokens = [];
  const activeTokens = [];
  const expiredTokenRefs = [];

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

    allTokens = allTokens.concat(result.data);
    after = result.after;
  } while (after);

  const fullname = getFullName(authUser);

  await Promise.all(
    allTokens.map(async ([deviceToken, _1, ref]) => {
      if (await isValidDeviceToken(deviceToken))
        activeTokens.push(deviceToken);
      else expiredTokenRefs.push(ref);
    })
  );

  console.log(allTokens, activeTokens, expiredTokenRefs);

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
    expiredTokenRefs.length
      ? faunadb.query(expiredTokenRefs.map(ref => query.Delete(ref)))
      : null
  ]);
};
