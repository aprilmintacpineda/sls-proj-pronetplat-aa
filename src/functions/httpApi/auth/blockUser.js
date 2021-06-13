const { query } = require('faunadb');
const {
  initClient,
  isOnBlockList,
  hasCompletedSetupQuery,
  create,
  getById,
  selectData,
  ifCompatibleTestAccountTypes,
  existsByIndex,
  selectRef,
  getByIndex
} = require('dependencies/utils/faunadb');
const {
  httpGuard,
  guardTypes
} = require('dependencies/utils/httpGuard');
const {
  sendWebSocketEvent
} = require('dependencies/utils/webSocket');

async function handler ({ authUser, params: { contactId } }) {
  const faunadb = initClient();

  try {
    await faunadb.query(
      query.If(
        isOnBlockList(authUser.id, contactId),
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
                query.If(
                  existsByIndex(
                    'contactRequestBySenderIdRecipientId',
                    authUser.id,
                    contactId
                  ),
                  query.Do(
                    query.Delete(
                      selectRef(
                        getByIndex(
                          'contactRequestBySenderIdRecipientId',
                          authUser.id,
                          contactId
                        )
                      )
                    ),
                    query.Call(
                      'updateUserBadgeCount',
                      contactId,
                      'receivedContactRequestsCount',
                      -1
                    )
                  ),
                  null
                ),
                query.If(
                  existsByIndex(
                    'contactRequestBySenderIdRecipientId',
                    contactId,
                    authUser.id
                  ),
                  query.Do(
                    query.Delete(
                      selectRef(
                        getByIndex(
                          'contactRequestBySenderIdRecipientId',
                          contactId,
                          authUser.id
                        )
                      )
                    ),
                    query.Call(
                      'updateUserBadgeCount',
                      authUser.id,
                      'receivedContactRequestsCount',
                      -1
                    )
                  ),
                  null
                ),
                create('userBlockings', {
                  blockerId: authUser.id,
                  userId: contactId
                }),
                query.If(
                  existsByIndex(
                    'contactByOwnerContact',
                    authUser.id,
                    contactId
                  ),
                  query.Do(
                    query.Delete(
                      selectRef(
                        getByIndex(
                          'contactByOwnerContact',
                          authUser.id,
                          contactId
                        )
                      )
                    ),
                    query.Call(
                      'updateUserBadgeCount',
                      authUser.id,
                      'contactsCount',
                      -1
                    )
                  ),
                  null
                ),
                query.If(
                  existsByIndex(
                    'contactByOwnerContact',
                    contactId,
                    authUser.id
                  ),
                  query.Do(
                    query.Delete(
                      selectRef(
                        getByIndex(
                          'contactByOwnerContact',
                          contactId,
                          authUser.id
                        )
                      )
                    ),
                    query.Call(
                      'updateUserBadgeCount',
                      contactId,
                      'contactsCount',
                      -1
                    )
                  ),
                  null
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

  await sendWebSocketEvent({
    type: 'blockedByUser',
    authUser,
    userId: contactId
  });

  return { statusCode: 200 };
}

module.exports = httpGuard({
  handler,
  guards: [guardTypes.auth, guardTypes.setupComplete]
});
