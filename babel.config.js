const alias = require('./importAliases');

console.log('test');

const config = {
  comments: false,
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '12'
        }
      }
    ]
  ],
  plugins: [],
  ignore: [/node_modules/]
};

if (process.env.NODE_ENV === 'production') {
  config.presets.push([
    'minify',
    {
      builtIns: false
    }
  ]);

  // we are replacing all imports from src/dependencies directory
  // to use layers on production.
  config.plugins.push([
    'search-and-replace',
    {
      rules: [
        {
          search: /dependencies\/nodejs/gim,
          replace: '/opt/nodejs'
        }
      ]
    }
  ]);
} else {
  config.plugins.push([
    'module-resolver',
    {
      root: ['./src'],
      alias
    }
  ]);
}

module.exports = config;
