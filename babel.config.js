const alias = require('./importAliases');

module.exports = {
  plugins: [
    '@babel/plugin-proposal-class-properties',
    [
      'module-resolver',
      {
        root: ['./src'],
        alias
      }
    ]
  ]
};
