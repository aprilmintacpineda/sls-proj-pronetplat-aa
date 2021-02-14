const fs = require('fs').promises;
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
  const file = await fs.readFile(filePath);

  const finalContent = file
    .toString()
    .replaceAll(target, replacement);

  await fs.writeFile(filePath, finalContent);
})();
