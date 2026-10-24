require('module-alias/register');

const { registerProcessHandlers, startApp } = require('@bootstrap');

registerProcessHandlers();
startApp().catch(() => process.exit(1));
