const eventPayloadParsers = require('./eventPayloadParsers');
const events = require('./events');

async function handler (ev) {
  const { eventName, payload } = ev;
  console.log('---', eventName);
  const payloadParser = eventPayloadParsers[eventName];
  const eventHandler = events[eventName];
  await eventHandler(payloadParser ? payloadParser(ev) : payload);
}

module.exports.handler = handler;
