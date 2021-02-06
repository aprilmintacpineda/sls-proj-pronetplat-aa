const { query } = require('faunadb');
const Notification = require('dependencies/nodejs/models/Notification');
const { initClient } = require('dependencies/nodejs/utils/faunadb');
const {
  sendPushNotification
} = require('dependencies/nodejs/utils/notifications');
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

    if (
      type === 'contactRequestAccepted' ||
      type === 'contactRequestCancelled' ||
      type === 'contactRequestDeclined'
    ) {
      const client = initClient();

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

    body = body.replace(/{fullname}/gim, getFullName(authUser));

    body = body.replace(
      /{genderPossessiveLowercase}/gim,
      getPersonalPronoun(authUser).possessive.lowercase
    );

    await sendPushNotification({
      userId,
      notification: {
        title,
        body,
        imageUrl: authUser.profilePicture
      },
      data: {
        ..._data,
        ...getUserPublicResponseData(authUser),
        type,
        category
      }
    });
  } catch (error) {
    console.log('error', error);
  }
};
