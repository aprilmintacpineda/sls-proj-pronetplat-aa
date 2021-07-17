const handlers = require('./handlers');

module.exports = async event => {
  const { objectKey } = event;
  const prefix = objectKey.split('_')[0];
  const handler = handlers[prefix];
  if (!handler) throw new Error(`Unknown prefix handler ${prefix}`);
  await handler(event);
};
