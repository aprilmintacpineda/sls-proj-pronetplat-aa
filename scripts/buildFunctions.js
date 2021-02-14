const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const babel = require('@babel/core');
const readDirRecursive = require('recursive-readdir-async');
const babelConfig = require('../babel.config');

const buildPath = path.join(__dirname, '../build');

function mkdir (dir) {
  if (fs.existsSync(dir)) return;
  return fsPromises.mkdir(dir, { recursive: true });
}

async function buildFunc ({ name, fullname }) {
  let file = await fsPromises.readFile(fullname);
  file = file.toString();

  const { code } = await babel.transformAsync(file, babelConfig);
  const filename = name.replace(/\.js$/, '');
  await mkdir(path.join(buildPath, filename));

  await fsPromises.writeFile(
    path.join(buildPath, filename, name),
    code
  );
}

(async () => {
  delete babelConfig.ignore;

  const functionFiles = await readDirRecursive.list(
    path.join(__dirname, '../src/functions')
  );

  await Promise.all(
    functionFiles.map(functionFile => buildFunc(functionFile))
  );

  await fsPromises.copyFile(
    path.join(__dirname, '../template.yaml'),
    path.join(buildPath, 'template.yaml')
  );
})();
