const { query } = require('faunadb');
const {
  initClient,
  isOnBlockList,
  hasPendingContactRequest,
  hasCompletedSetupQuery,
  create,
  hardDeleteIfExists,
  getById
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');
const validate = require('dependencies/utils/validate');

async function handler ({ authUser, formBody }) {
  const faunadb = initClient();

  try {
    await faunadb.query(
      query.If(
        query.Or(
          isOnBlockList(authUser, formBody.contactId),
          hasPendingContactRequest(authUser, formBody.contactId)
        ),
        query.Abort('isOnBlockList or hasPendingContactRequest'),
        query.If(
          hasCompletedSetupQuery(
            getById('users', formBody.contactId)
          ),
          query.Do(
            create('userBlockings', {
              blockerId: authUser.id,
              userId: formBody.contactId
            }),
            hardDeleteIfExists(
              'contactByOwnerContact',
              authUser.id,
              formBody.contactId
            )
          ),
          query.Abort('NotYetSetup')
        )
      )
    );
  } catch (error) {
    console.log('error', error);

    if (
      error.description ===
        'isOnBlockList or hasPendingContactRequest' ||
      error.description === 'NotYetSetup'
    )
      return { statusCode: 400 };

    return { statusCode: 500 };
  }

  return { statusCode: 200 };
}

module.exports.handler = httpGuard({
  handler,
  guards: [
    guardTypes.auth,
    guardTypes.deviceToken,
    guardTypes.setupComplete
  ],
  formValidator: ({ contactId }) => validate(contactId, ['required'])
});
