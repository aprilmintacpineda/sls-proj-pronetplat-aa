const { query } = require('faunadb');
const {
  initClient,
  getById,
  getByIndex
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
      query.Let(
        {
          eventOrganizer: getByIndex(
            'eventOrganizersByOrganizerEvent',
            authUser.id,
            eventId
          )
        },
        query.Lambda(
          ['userId', 'eventId', 'ref'],
          getById('_events', query.Var('eventId'))
        )
      )
    );
  } catch (error) {
    console.log(error);
    if (error.statusCode === 404) return { statusCode: 400 };
    return { statusCode: 500 };
  }

  console.log(JSON.stringify(event));

  const { signedUrl, url: coverPicture } = await getSignedUrlPromise(
    {
      objectKeyPrefix: 'newEventCoverPicture',
      objectName: `${event.ref.id}_${randomNum()}`,
      type: formBody.coverPicture,
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
