const { query } = require('faunadb');
const {
  initClient,
  existsByIndex,
  getById,
  updateById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, params: { eventId }, formBody }) {
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
        updateById('_events', eventId, {
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
          placeName
        }),
        query.Abort('CheckFailed')
      )
    );
  } catch (error) {
    console.log(error);

    if (error.description === 'CheckFailed')
      return { statusCode: 400 };

    return { statusCode: 500 };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      ...event.data,
      id: event.ref.id
    })
  };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete],
  formValidator: ({
    name,
    description,
    startDateTime,
    endDateTime,
    location,
    visibility,
    maxAttendees
  }) => {
    return (
      validate(name, ['required', 'maxLength:100']) ||
      validate(description, ['required', 'maxLength:5000']) ||
      validate(startDateTime, ['required', 'futureDate']) ||
      validate(endDateTime, [
        'required',
        `futureDate:${startDateTime}`
      ]) ||
      validate(location, ['required']) ||
      validate(visibility, ['required', 'options:private,public']) ||
      validate(maxAttendees, ['required', 'integer'])
    );
  }
});
