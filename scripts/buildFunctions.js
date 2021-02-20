const fs = require('fs').promises;
const path = require('path');
const babel = require('@babel/core');
const recursiveReadDir = require('recursive-readdir-async');
const babelConfig = require('../babel.config');

const buildPath = path.join(__dirname, '../build');

async function buildFunc ({ name, fullname }) {
  let file = await fs.readFile(fullname);
  file = file.toString();

  const { code } = await babel.transformAsync(file, babelConfig);
  await fs.writeFile(path.join(buildPath, name), code);
}

(async () => {
  try {
    delete babelConfig.ignore;

    const functionFiles = await recursiveReadDir.list(
      path.join(__dirname, '../src/functions')
    );

    await Promise.all(
      functionFiles.map(functionFile => buildFunc(functionFile))
    );

    await fs.copyFile(
      path.join(__dirname, '../template.yaml'),
      path.join(buildPath, 'template.yaml')
    );
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
})();
