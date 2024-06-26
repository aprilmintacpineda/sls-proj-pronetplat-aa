const { query } = require('faunadb');
const {
  initClient,
  getById,
  existsByIndex
} = require('dependencies/utils/faunadb');
const { randomNum } = require('dependencies/utils/helpers');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const { getSignedUrlPromise } = require('dependencies/utils/s3');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, params: { eventId }, formBody }) {
  const faunadb = initClient();
  let event = null;

  try {
    event = await faunadb.query(
      query.If(
        query.And(
          existsByIndex(
            'eventOrganizerByOrganizerEvent',
            authUser.id,
            eventId
          ),
          query.Equals(
            query.Select(
              ['data', 'status'],
              getById('_events', eventId)
            ),
            'unpublished'
          )
        ),
        getById('_events', eventId),
        query.Abort('eventNotFound')
      )
    );
  } catch (error) {
    console.log(error);

    if (error.description === 'eventNotFound')
      return { statusCode: 400 };

    return { statusCode: 500 };
  }

  const { signedUrl, url: coverPicture } = await getSignedUrlPromise(
    {
      objectKeyPrefix: 'newEventCoverPicture',
      objectName: `${event.ref.id}_${randomNum()}`,
      type: formBody.type,
      objectNamePrefix: 'eventCoverPicture'
    }
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      signedUrl,
      coverPicture
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.personalInfoComplete],
  formValidator: ({ type }) => {
    return validate(type, [
      'required',
      'options:image/jpeg,image/png'
    ]);
  }
});
