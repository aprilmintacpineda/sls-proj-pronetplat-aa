const events = require('./events');

async function handler ({ event, payload }) {
  const eventHandler = events[event];
  await eventHandler(payload);
}

module.exports.handler = handler;
