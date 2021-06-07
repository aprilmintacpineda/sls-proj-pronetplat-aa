const fs = require('fs').promises;
const path = require('path');
const babel = require('@babel/core');
const recursiveReadDir = require('recursive-readdir-async');
const babelConfig = require('../babel.config');

const buildPath = path.join(__dirname, '../build');

async function buildFunc ({ basePath, name, fullPath }) {
  let file = await fs.readFile(fullPath);
  file = file.toString();
  const { code } = await babel.transformAsync(file, babelConfig);
  await fs.writeFile(path.join(basePath, name), code);
}

function getBasePath (fullPath) {
  const result = /functions\/.*/.exec(fullPath);
  return result ? result[0].replace('functions/', '') : '/';
}

async function mkdirIfNotExists (dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.log(error);
  }
}

(async () => {
  try {
    delete babelConfig.ignore;

    const lambdaFunctions = await recursiveReadDir.list(
      path.join(__dirname, '../src/functions')
    );

    await Promise.all(
      lambdaFunctions.map(async file => {
        const basePath = path.join(
          buildPath,
          getBasePath(file.path)
        );

        await mkdirIfNotExists(basePath);

        await buildFunc({
          basePath,
          name: file.name,
          fullPath: file.fullname
        });
      })
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
