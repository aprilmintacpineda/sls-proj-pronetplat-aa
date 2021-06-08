const eventPayloadParsers = require('./eventPayloadParsers');
const events = require('./events');

async function handler (ev) {
  console.log('---', ev);
  const { eventName, payload } = ev;
  const payloadParser = eventPayloadParsers[eventName];
  const eventHandler = events[eventName];
  await eventHandler(payloadParser ? payloadParser(ev) : payload);
}

module.exports.handler = handler;
