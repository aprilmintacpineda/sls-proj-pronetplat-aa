const bcrypt = require('bcrypt');
const faker = require('faker');
const { query, Client } = require('faunadb');

function generateNRecords (n, mapCallback) {
  return Array.from(Array(n), (_1, index) => mapCallback(index));
}

function optional (value) {
  return faker.helpers.randomize([null, value]);
}

function ifDefined (value, callback) {
  return value ? callback() : null;
}

function either (...values) {
  return faker.helpers.randomize(values);
}

function createQuery (collection, data) {
  return query.Create(query.Collection(collection), {
    data: {
      ...data,
      createdAt: query.Format('%t', query.Now()),
      updatedAt: query.Format('%t', query.Now())
    }
  });
}

function generateUsers (numUsers) {
  const records = generateNRecords(numUsers, async index => {
    const [
      hashedPassword,
      hashedEmailVerificationCode
    ] = await Promise.all([
      bcrypt.hash('password', 10),
      bcrypt.hash('code', 10)
    ]);

    const lastLoginAt = optional(query.Now());

    const emailVerifiedAt = ifDefined(lastLoginAt, () =>
      optional(
        query.TimeAdd(
          lastLoginAt,
          faker.random.number({ min: 1, max: 10 }),
          'minutes'
        )
      )
    );

    return {
      email: `testuser${index + 1}@email.com`,
      hashedPassword,
      firstName: faker.name.firstName(),
      middleName: optional(faker.name.lastName()),
      lastName: faker.name.lastName(),
      gender: either('male', 'female'),
      bio: optional(faker.lorem.sentence()),
      jobTitle: faker.name.jobTitle(),
      profilePicture: faker.image.imageUrl(
        100,
        100,
        undefined,
        undefined,
        true
      ),
      company: optional(faker.company.companyName()),
      notificationsCount: 45,
      contactRequestsCount: 30,
      hashedEmailVerificationCode,
      emailCodeCanSendAt: faker.date.past().toISOString(),
      emailConfirmCodeExpiresAt: faker.date.past().toISOString(),
      emailVerifiedAt: emailVerifiedAt || null,
      lastLoginAt: lastLoginAt || null,
      completedFirstSetupAt: ifDefined(emailVerifiedAt, () =>
        optional(
          query.TimeAdd(
            emailVerifiedAt,
            faker.random.number({ min: 1, max: 10 }),
            'minutes'
          )
        )
      )
    };
  });

  return Promise.all(records);
}

async function main (numUsers) {
  const queriesForLater = [];

  const client = new Client({
    secret: 'fnAD9q43t4ACDb-_cBDCkcUxWHj303eieg8caCWg'
  });

  let users = await generateUsers(numUsers);
  users = await client.query(
    users.map(data => createQuery('users', data))
  );

  // each users will have at least 5 device tokens
  users.forEach((document, index) => {
    queriesForLater.push(
      generateNRecords(5, () =>
        createQuery('registeredDevices', {
          userId: document.ref.id,
          deviceToken: `APA91bFoi3lMMre9G3XzR1LrF4ZT82_15MsMdEICogXSLB8-MrdkRuRQFwNI5u8Dh0cI90ABD3BOKnxkEla8cGdisbDHl5cVIkZah5QUhSAxzx4Roa7b4xy9tvx9iNSYw-eXBYYd8k1XKf8Q_Qq1X9-x-U-Y79vdPq_${index}`,
          expiresAt: query.TimeAdd(query.Now(), 7, 'days')
        })
      )
    );
  });

  const [primaryUser, secondaryUser] = users.splice(0, 2);

  // 30% of user will have pending requests to primary and secondary users.
  users.splice(0, Math.floor(numUsers * 0.3)).forEach(document => {
    queriesForLater.push(
      createQuery('contactRequests', {
        senderId: document.ref.id,
        recipientId: primaryUser.ref.id,
        canFollowUpAt: faker.date.past()
      }),
      createQuery('contactRequests', {
        senderId: document.ref.id,
        recipientId: secondaryUser.ref.id,
        canFollowUpAt: faker.date.past()
      })
    );
  });

  // 15% of users declined
  users.splice(0, Math.floor(numUsers * 0.15)).forEach(document => {
    queriesForLater.push(
      createQuery('notifications', {
        userId: primaryUser.ref.id,
        type: 'contactRequestDeclined',
        body: '{fullname} has declined your contact request.',
        actorId: document.ref.id
      }),
      createQuery('notifications', {
        userId: secondaryUser.ref.id,
        type: 'contactRequestDeclined',
        body: '{fullname} has declined your contact request.',
        actorId: document.ref.id
      })
    );
  });

  // 15% of users accepted
  users.splice(0, Math.floor(numUsers * 0.15)).forEach(document => {
    queriesForLater.push(
      createQuery('notifications', {
        userId: primaryUser.ref.id,
        type: 'contactRequestAccepted',
        body: '{fullname} has accepted your contact request.',
        actorId: document.ref.id
      }),
      createQuery('notifications', {
        userId: secondaryUser.ref.id,
        type: 'contactRequestAccepted',
        body: '{fullname} has accepted your contact request.',
        actorId: document.ref.id
      })
    );
  });

  // 15% of users cancelled
  users.splice(0, Math.floor(numUsers * 0.15)).forEach(document => {
    queriesForLater.push(
      createQuery('notifications', {
        userId: primaryUser.ref.id,
        type: 'contactRequestCancelled',
        body:
          '{fullname} has cancelled {genderPossessiveLowercase} contact request.',
        actorId: document.ref.id
      }),
      createQuery('notifications', {
        userId: secondaryUser.ref.id,
        type: 'contactRequestCancelled',
        body:
          '{fullname} has cancelled {genderPossessiveLowercase} contact request.',
        actorId: document.ref.id
      })
    );
  });

  // primary and secondary users will block the remaining users
  users.splice(0).forEach(document => {
    queriesForLater.push(
      createQuery('userBlockings', {
        blockerId: primaryUser.ref.id,
        userId: document.ref.id
      }),
      createQuery('userBlockings', {
        blockerId: secondaryUser.ref.id,
        userId: document.ref.id
      })
    );
  });

  await client.query(queriesForLater);
}

main(100);
