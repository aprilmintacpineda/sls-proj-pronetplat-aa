const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody }) {
  console.log(JSON.stringify({ authUser, formBody }));

  return {
    statusCode: 400
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
    console.log(
      validate(name, ['required', 'maxLength:100']),
      validate(description, ['required', 'maxLength:5000']),
      validate(startDateTime, ['required', 'futureDate']),
      validate(endDateTime, [
        'required',
        `futureDate:${startDateTime}`
      ]),
      validate(location, ['required', 'options:private,public']),
      validate(visibility, ['required', 'options:private,public']),
      validate(maxAttendees, ['required', 'integer'])
    );

    return (
      validate(name, ['required', 'maxLength:100']) ||
      validate(description, ['required', 'maxLength:5000']) ||
      validate(startDateTime, ['required', 'futureDate']) ||
      validate(endDateTime, [
        'required',
        `futureDate:${startDateTime}`
      ]) ||
      validate(location, ['required', 'options:private,public']) ||
      validate(visibility, ['required', 'options:private,public']) ||
      validate(maxAttendees, ['required', 'integer'])
    );
  }
});
