module.exports.randomCode = function randomCode () {
  return Math.random().toString(32).substr(2, 5);
};