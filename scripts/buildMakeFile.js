const fs = require('fs').promises;
const path = require('path');
const recursiveReadDir = require('recursive-readdir-async');

(async () => {
  const functions = await recursiveReadDir.list(
    path.join(__dirname, '../src/functions')
  );

  let phonies = '';
  let targets = '';

  functions.forEach(({ name }) => {
    const blockName = `build-${name.split('.')[0]}`;

    targets +=
      `${blockName}:\n\tcp ${name} ` +
      '"${ARTIFACTS_DIR}/' +
      name +
      '"\n\n';

    phonies += ` ${blockName}`;
  });

  // for the dependencies layer
  targets += 'build-dependencies:\n';
  targets += '\tmkdir -p "$(ARTIFACTS_DIR)/nodejs"\n';
  targets += '\tcp -r . "$(ARTIFACTS_DIR)/nodejs/"\n';
  targets +=
    '\tyarn --production --cwd "$(ARTIFACTS_DIR)/nodejs/"\n';

  fs.writeFile('Makefile', `.PHONY:${phonies}\n\n${targets}`);
})();
