const { query } = require('faunadb');
const {
  initClient,
  isOnBlockList,
  hasPendingContactRequest,
  hasCompletedSetupQuery,
  create,
  hardDeleteIfExists,
  getById,
  selectData,
  ifCompatibleTestAccountTypes
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/guards');

async function handler ({ authUser, params: { contactId } }) {
  const faunadb = initClient();

  try {
    /**
     * @todo
     * Cancel sent contact request or received contact request
     * before blocking the user
     */

    await faunadb.query(
      query.Let(
        {
          contact: selectData(getById('users', contactId))
        },
        ifCompatibleTestAccountTypes(
          authUser,
          query.Var('contact'),
          query.If(
            query.Or(
              isOnBlockList(authUser, contactId),
              hasPendingContactRequest(authUser, contactId)
            ),
            query.Abort('isOnBlockListhasPendingContactRequest'),
            query.If(
              hasCompletedSetupQuery(query.Var('contact')),
              query.Do(
                create('userBlockings', {
                  blockerId: authUser.id,
                  userId: contactId
                }),
                hardDeleteIfExists(
                  'contactByOwnerContact',
                  authUser.id,
                  contactId
                )
              ),
              query.Abort('NotYetSetup')
            )
          )
        )
      )
    );
  } catch (error) {
    console.log('error', error);

    if (
      error.description ===
        'isOnBlockListhasPendingContactRequest' ||
      error.description === 'NotYetSetup'
    )
      return { statusCode: 400 };

    return { statusCode: 500 };
  }

  return { statusCode: 200 };
}

module.exports.handler = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
