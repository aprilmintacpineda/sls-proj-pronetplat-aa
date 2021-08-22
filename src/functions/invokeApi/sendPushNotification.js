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
  recipientId,
  body: _body,
  title: _title,
  payload
}) => {
  if (recipientId === authUser.id) {
    console.log('invalid: trying to send notification to self.');
    return;
  }

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
          recipientId
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
    },
    user: {
      '{userFullNamePossessive}': user => {
        console.log(
          '{userFullNamePossessive}',
          JSON.stringify(user)
        );

        return user.id === authUser.id
          ? getPersonalPronoun(authUser).possessive.lowercase
          : `${getFullName(user)}'s`;
      }
    }
  };
  let getters = {};

  if (payload) {
    if (payload.eventId)
      getters.event = getById('_events', payload.eventId);

    if (payload.userId)
      getters.user = getById('users', payload.userId);
  }

  const gettersKeys = Object.keys(getters);

  if (gettersKeys.length) {
    getters = await faunadb.query(query.Do(getters));

    gettersKeys.forEach(key => {
      const data = getters[key].data;
      const dataPlaceholders = placeholders[key];

      Object.keys(dataPlaceholders).forEach(placeholder => {
        let value = dataPlaceholders[placeholder];

        if (typeof value === 'function') value = value(data);
        else value = data[value];

        title = title.replace(placeholder, value);
        body = body.replace(placeholder, value);
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
