const eventPayloadParsers = require('./eventPayloadParsers');
const events = require('./events');

function parseEvent (event) {
  let payload = null;
  let eventName = null;

  if (event.Records) {
    eventName = event.Records[0].eventName;
    payload = eventPayloadParsers[eventName](event);
  } else {
    payload = event.payload;
    eventName = event.eventName;
  }

  return { eventName, payload };
}

async function handler (event) {
  const parsedEvent = parseEvent(event);
  console.log(parsedEvent);
  const { eventName, payload } = parsedEvent;
  console.log('---', eventName);
  const eventHandler = events[eventName];
  await eventHandler(payload);
}

module.exports.handler = handler;
