const createRateLimiter = require('@src/middlewares/rateLimit.middleware');

const paymentRateLimiter = createRateLimiter({
    limit: 10,
    windowSec: 60,
    prefix: 'payment'
});

const paymentCreateRateLimiter = createRateLimiter({
    limit: 5,
    windowSec: 60,
    prefix: 'payment:create'
});

const paymentVerifyRateLimiter = createRateLimiter({
    limit: 10,
    windowSec: 60,
    prefix: 'payment:verify'
});

module.exports = {
    paymentRateLimiter,
    paymentCreateRateLimiter,
    paymentVerifyRateLimiter
};

