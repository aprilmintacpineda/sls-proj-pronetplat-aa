const { query } = require('faunadb');
const {
  initClient,
  existsByIndex,
  create
} = require('dependencies/utils/faunadb');
const { randomNum } = require('dependencies/utils/helpers');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const { getSignedUrlPromise } = require('dependencies/utils/s3');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody }) {
  // @todo validate location using place id?

  const faunadb = initClient();

  let latitude = null;
  let longitude = null;
  let googlePlaceId = null;
  let address = null;
  let placeName = null;

  try {
    // resolve variables from google places
    const location = formBody.location;
    latitude = location.location.latitude;
    longitude = location.location.longitude;
    googlePlaceId = location.placeID;
    address = location.address;
    placeName = location.name;

    if (
      !latitude ||
      !longitude ||
      !googlePlaceId ||
      !address ||
      !placeName
    )
      throw new Error('A required location variable was not found.');
  } catch (error) {
    console.log(error);
    return { statusCode: 400 };
  }

  let event = null;

  try {
    const createQuery = query.Let(
      {
        event: create('_events', {
          name: formBody.name,
          description: formBody.description,
          startDateTime: formBody.startDateTime,
          endDateTime: formBody.endDateTime,
          visibility: formBody.visibility,
          maxAttendees: formBody.maxAttendees,
          latitude,
          longitude,
          googlePlaceId,
          address,
          placeName,
          status: 'creating',
          numGoing: 0,
          numInterested: 0
        }),
        eventId: query.Select(['ref', 'id'], query.Var('event'))
      },
      query.Do(
        create('eventOrganizers', {
          eventId: query.Var('eventId'),
          userId: authUser.id
        }),
        ...formBody.organizers.map(user =>
          create('eventOrganizers', {
            eventId: query.Var('eventId'),
            userId: user.id
          })
        ),
        query.Var('event')
      )
    );

    // if organizer was set,
    // validate that selected organizers are contacts of authUser
    event = await faunadb.query(
      formBody.organizers.length
        ? query.If(
            query.And(
              formBody.organizers.map(contact =>
                existsByIndex(
                  'contactByOwnerContact',
                  contact.id,
                  authUser.id
                )
              )
            ),
            createQuery,
            query.Abort('NonContactOrganizer')
          )
        : createQuery
    );
  } catch (error) {
    console.log(error);

    if (error.description === 'NonContactOrganizer')
      return { statusCode: 400 };

    return { statusCode: 500 };
  }

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
  guards: [guardTypes.auth, guardTypes.setupComplete],
  formValidator: ({
    coverPicture,
    name,
    description,
    startDateTime,
    endDateTime,
    location,
    visibility,
    maxAttendees
  }) => {
    return (
      validate(coverPicture, [
        'required',
        'options:image/jpeg,image/png'
      ]),
      validate(name, ['required', 'maxLength:100']) ||
        validate(description, ['required', 'maxLength:5000']) ||
        validate(startDateTime, ['required', 'futureDate']) ||
        validate(endDateTime, [
          'required',
          `futureDate:${startDateTime}`
        ]) ||
        validate(location, ['required']) ||
        validate(visibility, [
          'required',
          'options:private,public'
        ]) ||
        validate(maxAttendees, ['required', 'integer'])
    );
  }
});