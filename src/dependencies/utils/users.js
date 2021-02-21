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
