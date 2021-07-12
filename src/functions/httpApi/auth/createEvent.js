const { query } = require('faunadb');
const {
  initClient,
  existsByIndex,
  create
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
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
          placeName
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
        )
      )
    );

    // if organizer was set,
    // validate that selected organizers are contacts of authUser
    await faunadb.query(
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

  return { statusCode: 200 };
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
