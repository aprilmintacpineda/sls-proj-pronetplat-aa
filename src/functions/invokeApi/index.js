const events = require('./events');

async function handler ({ event, payload }) {
  console.log('---', event);
  const eventHandler = events[event];
  await eventHandler(payload);
}

module.exports.handler = handler;
