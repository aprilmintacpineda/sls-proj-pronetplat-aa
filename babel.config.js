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
  if (!process.env.JWT_SECRET) {
    console.log('JWT_SECRET must be provided!');
    process.exit(1);
  }

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
          search: /dependencies\//gm,
          replace: '/opt/nodejs/'
        },
        {
          search: /__JWTSecret__/gm,
          replace: process.env.JWT_SECRET
        },
        {
          search: /__webSocketUrl__/gm,
          replace: process.env.WEBSOCKET_URL
        },
        {
          search: /__googleApiKey__/gm,
          replace: process.env.GOOGLE_API_KEY
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
