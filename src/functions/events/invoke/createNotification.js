const { query } = require('faunadb');
const Notification = require('dependencies/nodejs/models/Notification');
const { initClient } = require('dependencies/nodejs/utils/faunadb');
const {
  sendPushNotification
} = require('dependencies/nodejs/utils/firebase');
const {
  hasTimePassed
} = require('dependencies/nodejs/utils/helpers');
const {
  getFullName,
  getPersonalPronoun,
  getUserPublicResponseData
} = require('dependencies/nodejs/utils/users');

module.exports.handler = async ({
  authUser,
  userId,
  body,
  type,
  title,
  category,
  data: _data
}) => {
  try {
    const promises = [
      new Notification().create({
        userId,
        type,
        body,
        actorId: authUser.id
      })
    ];

    const client = initClient();

    if (
      type === 'contactRequestAccepted' ||
      type === 'contactRequestCancelled' ||
      type === 'contactRequestDeclined'
    ) {
      promises.push(
        client.query(
          query.Call(
            'updateUserBadgeCount',
            authUser.id,
            'receivedContactRequestsCount',
            -1
          )
        )
      );
    }

    let after = null;

    body = body.replace(/{fullname}/gim, getFullName(authUser));

    body = body.replace(
      /{genderPossessiveLowercase}/gim,
      getPersonalPronoun(authUser).possessive.lowercase
    );

    const notification = {
      title,
      body,
      imageUrl: authUser.profilePicture
    };

    const data = {
      ..._data,
      ...getUserPublicResponseData(authUser),
      type,
      category
    };

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

      const tokens = result.data.reduce((accumulator, data) => {
        const [expiresAt, deviceToken] = data;
        if (hasTimePassed(expiresAt)) return accumulator;
        return accumulator.concat(deviceToken);
      }, []);

      await sendPushNotification({
        tokens,
        notification,
        data
      });

      after = result.after;
    } while (after);
  } catch (error) {
    console.log('error', error);
  }
};
