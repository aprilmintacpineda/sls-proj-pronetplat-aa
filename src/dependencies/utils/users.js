export function hasCompletedSetup (user) {
  return (
    user.firstName &&
    user.surname &&
    user.gender &&
    user.jobTitle &&
    user.profilePicture &&
    user.emailVerifiedAt
  );
}

export function hasCompletePersonalInfo (user) {
  return (
    user.firstName &&
    user.surname &&
    user.gender &&
    user.jobTitle &&
    user.emailVerifiedAt
  );
}

export function getPublicUserData ({ ref, data }) {
  return {
    id: ref.id,
    firstName: data.firstName,
    middleName: data.middleName || '',
    surname: data.surname,
    profilePicture: data.profilePicture,
    gender: data.gender,
    bio: data.bio || '',
    company: data.company || '',
    jobTitle: data.jobTitle,
    isTestAccount: data.isTestAccount
  };
}

export function getUserData ({ ref, data }) {
  return {
    id: ref.id,
    email: data.email,
    firstName: data.firstName,
    middleName: data.middleName,
    surname: data.surname,
    gender: data.gender,
    bio: data.bio,
    jobTitle: data.jobTitle,
    profilePicture: data.profilePicture,
    company: data.company,
    notificationsCount: data.notificationsCount,
    receivedContactRequestsCount: data.receivedContactRequestsCount,
    contactsCount: data.contactsCount,
    unreadChatMessagesCount: data.unreadChatMessagesCount,
    emailCodeCanSendAt: data.emailCodeCanSendAt,
    emailConfirmCodeExpiresAt: data.emailConfirmCodeExpiresAt,
    emailVerifiedAt: data.emailVerifiedAt,
    lastLoginAt: data.lastLoginAt,
    createdAt: data.createdAt,
    isTestAccount: data.isTestAccount,
    allowSearchByName: data.allowSearchByName,
    allowSearchByUsername: data.allowSearchByUsername,
    username: data.username
  };
}

export function getFullName (userData) {
  return (
    userData.firstName +
    (userData.middleName ? ` ${userData.middleName} ` : ' ') +
    userData.surname
  );
}

export function getPersonalPronoun (userData) {
  if (userData.gender === 'male') {
    return {
      subjective: {
        ucfirst: 'He',
        lowercase: 'he'
      },
      objective: {
        ucfirst: 'Him',
        lowercase: 'him'
      },
      possessive: {
        ucfirst: 'His',
        lowercase: 'his'
      }
    };
  }

  return {
    subjective: {
      ucfirst: 'She',
      lowercase: 'she'
    },
    objective: {
      ucfirst: 'Her',
      lowercase: 'her'
    },
    possessive: {
      ucfirst: 'Her',
      lowercase: 'her'
    }
  };
}
