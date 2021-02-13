const fs = require('fs').promises;
const path = require('path');
const cmdArgs = require('command-line-args');

const options = [
  {
    name: 'secret',
    alias: 's',
    type: String,
    description: 'The secret to be injected'
  }
];

(async () => {
  const { secret } = cmdArgs(options);

  const filePath = path.join(
    __dirname,
    '../build/dependencies/nodejs/utils/jwt.js'
  );

  const file = await fs.readFile(filePath);

  const finalContent = file
    .toString()
    .replace(/__JWTSecret__/gim, secret);

  await fs.writeFile(filePath, finalContent);
})();
