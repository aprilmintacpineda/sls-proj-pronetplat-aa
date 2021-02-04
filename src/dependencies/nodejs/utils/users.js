export function getUserPublicResponseData (userData) {
  return {
    id: userData.id,
    firstName: userData.firstName,
    middleName: userData.middleName,
    surname: userData.surname,
    profilePicture: userData.profilePicture,
    gender: userData.gender,
    bio: userData.bio,
    company: userData.company,
    jobTitle: userData.jobTitle
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

export function throwIfNotCompletedSetup (user) {
  if (!user.completedFirstSetupAt) throw new Error('User not setup');
  if (!user.emailVerifiedAt) throw new Error('Email not verified');
}
