const fs = require('fs').promises;
const path = require('path');

(async () => {
  const blockedKeys = ['scripts', 'lint-staged'];
  const input = path.join(__dirname, '../package.json');
  const outputs = [
    path.join(__dirname, '../build/package.json'),
    path.join(__dirname, '../build/dependencies/package.json')
  ];

  let packageJson = await fs.readFile(input, 'utf-8');

  packageJson = JSON.parse(packageJson);

  packageJson = Object.keys(packageJson).reduce(
    (accumulator, key) => {
      if (!blockedKeys.includes(key))
        accumulator[key] = packageJson[key];

      return accumulator;
    },
    {}
  );

  packageJson = JSON.stringify(packageJson);

  await Promise.all(
    outputs.map(output => fs.writeFile(output, packageJson))
  );
})();
