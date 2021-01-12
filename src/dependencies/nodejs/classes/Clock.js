const { randomNum, wait } = require('/opt/nodejs/utils/helpers');

module.exports = class Clock {
  constructor (minTimeMs) {
    this.startedAt = Date.now();
    this.minTimeMs = minTimeMs;
  }

  waitTillEnd () {
    const timeTaken = Date.now() - this.startedAt;
    const timeRemaining = this.minTimeMs - timeTaken;

    if (timeRemaining > 0) {
      const waitingTime = timeRemaining + randomNum(0, 100);

      console.log('waitTillEnd timeTaken', timeTaken);
      console.log('waitTillEnd timeRemaining', timeRemaining);
      console.log('waitTillEnd waitingTime', waitingTime);

      return wait(waitingTime);
    }
  }
};
