const { startApp } = require('./lifecycle/start');
const { registerProcessHandlers } = require('./lifecycle/processHandlers');

module.exports = {
  startApp,
  registerProcessHandlers,
};
