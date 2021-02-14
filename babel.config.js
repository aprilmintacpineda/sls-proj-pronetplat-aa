const alias = require('./importAliases');

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
        },
        {
          search: /__JWTSecret__/gim,
          replace: process.env.JWT_SECRET
        },
        {
          search: /__appPackageName__/gim,
          replace: process.env.APP_PACKAGE_NAME
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
