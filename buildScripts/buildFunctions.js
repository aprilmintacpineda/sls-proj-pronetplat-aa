const fs = require('fs').promises;
const path = require('path');
const babel = require('@babel/core');
const recursiveReadDir = require('recursive-readdir-async');
const babelConfig = require('../babel.config');

const buildPath = path.join(__dirname, '../build');

async function buildFunc (fullPath) {
  let file = await fs.readFile(fullPath);
  file = file.toString();
  return babel.transformAsync(file, babelConfig);
}

function getBasePath (fullPath) {
  const result = /functions\/.*/.exec(fullPath);
  return result ? result[0].replace('functions/', '') : '/';
}

const mkdirIfNotExistsCaches = [];

async function mkdirIfNotExists (dir) {
  if (mkdirIfNotExistsCaches.includes(dir)) return;
  mkdirIfNotExistsCaches.push(dir);

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

        const [{ code }] = await Promise.all([
          buildFunc(file.fullname),
          mkdirIfNotExists(basePath)
        ]);

        await fs.writeFile(path.join(basePath, file.name), code);
      })
    );
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
})();
