const { query } = require('faunadb');

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

export function getUserPublicResponseDataQuery (id, fromVar) {
  return {
    id,
    firstName: query.Select(['firstName'], fromVar),
    middleName: query.Select(['middleName'], fromVar),
    surname: query.Select(['surname'], fromVar),
    profilePicture: query.Select(['profilePicture'], fromVar, null),
    gender: query.Select(['gender'], fromVar, null),
    bio: query.Select(['bio'], fromVar, null),
    company: query.Select(['company'], fromVar, null),
    jobTitle: query.Select(['jobTitle'], fromVar, null)
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
