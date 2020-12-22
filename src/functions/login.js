async function login (event) {
  console.log(event);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Ah, shit.'
    })
  };
}

exports.handler = login;