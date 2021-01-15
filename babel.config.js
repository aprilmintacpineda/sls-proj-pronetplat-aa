const alias = require('./importAliases');

module.exports = {
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
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias
      }
    ]
  ],
  ignore: [/node_modules/]
};
