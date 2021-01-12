const { randomNum, wait } = require('/opt/nodejs/utils/helpers');

module.exports = class Clock {
  constructor (minTimeMs) {
    this.startedAt = Date.now();
    this.minTimeMs = minTimeMs;
  }

  async waitTillEnd () {
    const timeRemaining = this.minTimeMs - (Date.now() - this.startedAt);
    if (timeRemaining > 0) await wait(timeRemaining + randomNum(0, 100));
  }
};
