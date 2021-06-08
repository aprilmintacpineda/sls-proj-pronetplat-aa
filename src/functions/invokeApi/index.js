const events = require('./events');

async function handler (ev) {
  console.log('---', ev);
  const { event, payload } = ev;
  const eventHandler = events[event];
  await eventHandler(payload);
}

module.exports.handler = handler;
