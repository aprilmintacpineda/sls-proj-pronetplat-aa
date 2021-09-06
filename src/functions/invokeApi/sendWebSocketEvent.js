const { query } = require('faunadb');
const {
  initClient,
  hardDeleteByIndex,
  getById,
  existsByIndex
} = require('dependencies/utils/faunadb');
const { getPublicUserData } = require('dependencies/utils/users');
const { postToConnection } = require('dependencies/utils/webSocket');

module.exports = async ({
  authUser,
  recipientId,
  type,
  trigger,
  payload,
  otherUserPayload
}) => {
  if (recipientId === authUser.id) {
    console.log('invalid: trying to send notification to self.');
    return;
  }

  const faunadb = initClient();
  let after = null;
  let connectionIds = [];

  do {
    const result = await faunadb.query(
      query.Paginate(
        query.Match(
          query.Index('userWebSocketConnectionsByUserId'),
          recipientId
        ),
        {
          size: 20,
          after: after || []
        }
      )
    );

    connectionIds = connectionIds.concat(result.data);
    after = result.after;
  } while (after);

  // some data are being resolved from the payloads
  const resolvedPayloads = {};
  let getters = {};

  if (payload) {
    if (payload.eventId) {
      getters.event = query.Let(
        {
          event: getById('_events', payload.eventId)
        },
        query.Merge(query.Var('event'), {
          data: query.Merge(
            query.Select(['data'], query.Var('event')),
            {
              isOrganizer: existsByIndex(
                'eventOrganizerByOrganizerEvent',
                recipientId,
                payload.eventId
              ),
              isGoing: existsByIndex(
                'eventAttendeeByUserEvent',
                authUser.id,
                query.Select(['id'], query.Var('ref'))
              )
            }
          )
        })
      );
    }

    if (payload.userId)
      getters.user = getById('users', payload.userId);
  }

  const gettersKeys = Object.keys(getters);

  if (gettersKeys.length) {
    getters = await faunadb.query(query.Do(getters));

    gettersKeys.forEach(key => {
      const result = getters[key];

      resolvedPayloads[key] = {
        id: result.ref.id,
        ...result.data
      };
    });
  }

  const staleConnectionIds = [];

  await Promise.all(
    connectionIds.map(async ([connectionId]) => {
      try {
        await postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify({
            sender: {
              ...getPublicUserData({
                ref: { id: authUser.id },
                data: authUser
              }),
              ...otherUserPayload
            },
            trigger,
            type,
            payload: {
              ...payload,
              ...resolvedPayloads
            }
          })
        });
      } catch (error) {
        console.log('error', error);

        if (error.statusCode === 410)
          staleConnectionIds.push(connectionId);
      }
    })
  );

  // delete all stale connections in one go
  if (staleConnectionIds.length) {
    await faunadb.query(
      staleConnectionIds.map(connectionId =>
        hardDeleteByIndex(
          'userWebSocketConnectionByConnectionId',
          connectionId
        )
      )
    );
  }
};
