const { randomNum, wait } = require('/opt/nodejs/utils/helpers');

module.exports = class Clock {
  constructor (minTimeSecs) {
    this.startedAt = Date.now();
    this.minTime = minTimeSecs * 1000;
  }

  async waitTillEnd () {
    const timeRemaining = this.minTime - (Date.now() - this.startedAt);
    if (timeRemaining > 0) await wait(timeRemaining + randomNum(0, 100));
  }
};
