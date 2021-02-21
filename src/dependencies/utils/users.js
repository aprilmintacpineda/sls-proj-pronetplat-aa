export function getUserPublicResponseData (user) {
  return {
    id: user.ref.i,
    firstName: user.data.firstName,
    middleName: user.data.middleName || '',
    surname: user.data.surname,
    profilePicture: user.data.profilePicture,
    gender: user.data.gender,
    bio: user.data.bio || '',
    company: user.data.company || '',
    jobTitle: user.data.jobTitle
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
    contactRequestsCount: user.data.contactRequestsCount,
    emailCodeCanSendAt: user.data.emailCodeCanSendAt,
    emailConfirmCodeExpiresAt: user.data.emailConfirmCodeExpiresAt,
    emailVerifiedAt: user.data.emailVerifiedAt,
    lastLoginAt: user.data.lastLoginAt
  };
}

export function getFullName (user) {
  return (
    user.data.firstName +
    (user.data.middleName ? ` ${user.data.middleName} ` : ' ') +
    user.data.surname
  );
}

export function getPersonalPronoun (user) {
  if (user.data.gender === 'male') {
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

export function hasCompletedSetup (user) {
  return Boolean(
    user.data.firstName &&
      user.data.surname &&
      user.data.gender &&
      user.data.jobTitle &&
      user.data.profilePicture &&
      user.data.emailVerifiedAt
  );
}
