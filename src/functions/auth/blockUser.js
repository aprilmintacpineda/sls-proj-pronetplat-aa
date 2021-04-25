const { query } = require('faunadb');
const {
  initClient,
  isOnBlockList,
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
    await faunadb.query(
      query.If(
        isOnBlockList(authUser, contactId),
        query.Abort('alreadyBlocked'),
        query.Let(
          {
            contact: selectData(getById('users', contactId))
          },
          query.If(
            hasCompletedSetupQuery(query.Var('contact')),
            ifCompatibleTestAccountTypes(
              authUser,
              query.Var('contact'),
              query.Do(
                hardDeleteIfExists(
                  'contactRequestBySenderIdRecipientId',
                  authUser.id,
                  contactId
                ),
                hardDeleteIfExists(
                  'contactRequestBySenderIdRecipientId',
                  contactId,
                  authUser.id
                ),
                create('userBlockings', {
                  blockerId: authUser.id,
                  userId: contactId
                }),
                hardDeleteIfExists(
                  'contactByOwnerContact',
                  authUser.id,
                  contactId
                ),
                hardDeleteIfExists(
                  'contactByOwnerContact',
                  contactId,
                  authUser.id
                )
              )
            ),
            query.Abort('NotYetSetup')
          )
        )
      )
    );
  } catch (error) {
    console.log('error', error);

    if (
      error.description === 'NotCompatibleTestAccountTypes' ||
      error.description === 'NotYetSetup' ||
      error.description === 'alreadyBlocked'
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
