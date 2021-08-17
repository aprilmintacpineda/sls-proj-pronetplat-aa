const { query } = require('faunadb');
const {
  initClient,
  getById
} = require('dependencies/utils/faunadb');
const {
  sendFirebaseNotification,
  isValidDeviceToken
} = require('dependencies/utils/firebase');
const {
  getFullName,
  getPersonalPronoun
} = require('dependencies/utils/users');

module.exports = async ({
  authUser,
  userId,
  body: _body,
  title: _title,
  payload
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

  await Promise.all(
    allTokens.map(async ([deviceToken, _1, ref]) => {
      if (await isValidDeviceToken(deviceToken))
        activeTokens.push(deviceToken);
      else expiredTokenRefs.push(ref);
    })
  );

  const fullname = getFullName(authUser);

  // user related placeholders
  let title = _title.replace(/{fullname}/gim, fullname);
  let body = _body
    .replace(/{fullname}/gim, fullname)
    .replace(
      /{genderPossessiveLowercase}/gim,
      getPersonalPronoun(authUser).possessive.lowercase
    );

  // some placeholders are resolved from the database through the payload
  const placeholders = {
    event: {
      '{eventName}': 'name'
    }
  };
  let getters = {};

  if (payload?.eventId)
    getters.event = getById('_events', payload.eventId);

  const gettersKeys = Object.keys(getters);

  if (gettersKeys.length) {
    getters = await faunadb.query(query.Do(getters));

    gettersKeys.forEach(key => {
      const data = getters[key].data;

      const dataPlaceholders = placeholders[key];

      Object.keys(dataPlaceholders).forEach(placeholder => {
        const field = dataPlaceholders[placeholder];
        title = title.replace(placeholder, data[field]);
        body = body.replace(placeholder, data[field]);
      });
    });
  }

  await Promise.all([
    sendFirebaseNotification({
      tokens: activeTokens,
      notification: {
        imageUrl: authUser.profilePicture,
        title,
        body
      }
    }),
    expiredTokenRefs.length
      ? faunadb.query(expiredTokenRefs.map(ref => query.Delete(ref)))
      : null
  ]);
};
