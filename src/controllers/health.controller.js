const mongoose = require('mongoose');
const { redisClient } = require('@config/redis.config');

function healthController(req, res) {
  const checks = {
    mongo: mongoose.connection.readyState === 1,
    redis: Boolean(redisClient?.isOpen),
    workers: process.env.RUN_PAYMENT_WORKERS !== 'false',
  };

  const ready = Object.values(checks).every(Boolean);
  return res.status(ready ? 200 : 503).json({
    status: ready ? 'ok' : 'not_ready',
    ready,
    checks,
  });
}

module.exports = healthController;
