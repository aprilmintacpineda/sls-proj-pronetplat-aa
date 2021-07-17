const { randomNum } = require('dependencies/utils/helpers');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const { getSignedUrlPromise } = require('dependencies/utils/s3');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody }) {
  const { signedUrl, url: profilePicture } =
    await getSignedUrlPromise({
      objectKeyPrefix: 'newProfilePicture',
      objectName: `${authUser.id}_${randomNum()}`,
      type: formBody.type,
      objectNamePrefix: 'profilePicture'
    });

  return {
    statusCode: 200,
    body: JSON.stringify({
      signedUrl,
      profilePicture
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
