const fs = require('fs').promises;
const path = require('path');

(async () => {
  const lambdaFunctions = await fs.readdir(
    path.join(__dirname, '../src/functions')
  );

  let phonies = '';
  let targets = '';

  lambdaFunctions.forEach(name => {
    const blockName = `build-${name.split('.')[0]}`;

    phonies += ` ${blockName}`;

    targets += `${blockName}:\n`;
    targets +=
      `\tcp -r ${name} ` + '"${ARTIFACTS_DIR}/' + `${name}"\n`;

    // separator
    targets += '\n';
  });

  // for the dependencies layer
  targets += 'build-dependencies:\n';
  targets += '\tmkdir -p "$(ARTIFACTS_DIR)/nodejs"\n';
  targets += '\tcp -r . "$(ARTIFACTS_DIR)/nodejs/"\n';
  targets +=
    '\tyarn --production --prefer-offline --cwd "$(ARTIFACTS_DIR)/nodejs/"\n';

  fs.writeFile('Makefile', `.PHONY:${phonies}\n\n${targets}`);
})();
