const fs = require('fs').promises;
const path = require('path');
const cmdArgs = require('command-line-args');

const options = [
  {
    name: 'target',
    alias: 't',
    type: String,
    description: 'The target text to be replaced'
  },
  {
    name: 'replacement',
    alias: 'r',
    type: String,
    description: 'The value to replace it with'
  },
  {
    name: 'filePath',
    alias: 'f',
    type: String,
    description: 'Path to file'
  }
];

(async () => {
  const { target, filePath, replacement } = cmdArgs(options);
  const fileLocation = path.join(__dirname, '../', filePath);
  const file = await fs.readFile(fileLocation);

  const finalContent = file
    .toString()
    .replaceAll(target, replacement);

  await fs.writeFile(fileLocation, finalContent);
})();
