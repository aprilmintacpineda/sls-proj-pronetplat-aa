function login ({ body }) {
  console.log(body);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Ah, shit.'
    })
  };
}

exports.handler = login;