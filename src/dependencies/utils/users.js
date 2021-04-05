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

export function getPublicUserData (user) {
  return {
    id: user.ref.id,
    firstName: user.data.firstName,
    middleName: user.data.middleName || '',
    surname: user.data.surname,
    profilePicture: user.data.profilePicture,
    gender: user.data.gender,
    bio: user.data.bio || '',
    company: user.data.company || '',
    jobTitle: user.data.jobTitle,
    isTestAccount: user.data.isTestAccount
  };
}

export function getUserData (user) {
  return {
    id: user.ref.id,
    email: user.data.email,
    firstName: user.data.firstName,
    middleName: user.data.middleName,
    surname: user.data.surname,
    gender: user.data.gender,
    bio: user.data.bio,
    jobTitle: user.data.jobTitle,
    profilePicture: user.data.profilePicture,
    company: user.data.company,
    notificationsCount: user.data.notificationsCount,
    receivedContactRequestsCount:
      user.data.receivedContactRequestsCount,
    emailCodeCanSendAt: user.data.emailCodeCanSendAt,
    emailConfirmCodeExpiresAt: user.data.emailConfirmCodeExpiresAt,
    emailVerifiedAt: user.data.emailVerifiedAt,
    lastLoginAt: user.data.lastLoginAt,
    createdAt: user.data.createdAt,
    isTestAccount: user.data.isTestAccount
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
