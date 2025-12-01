const { redisClient } = require('@src/config/redis.config');
const Response = require('@src/utils/responseHandler/standardized');

function createRateLimiter(options = {}) {
    const { limit = 10, windowSec = 60, prefix = 'rl' } = options;

    return async (req, res, next) => {
        try {
            if (!redisClient || !redisClient.isOpen) {
                return next();
            }

            const userId = req.user?.sub || req.ip;
            const key = `${prefix}:${userId}`;

            const current = await redisClient.incr(key);
            
            if (current === 1) {
                await redisClient.expire(key, windowSec);
            }

            if (current > limit) {
                return Response.error(res, {
                    message: 'Too many requests. Please try again later.',
                    statusCode: 429
                });
            }

            next();
        } catch (error) {
            console.log('Rate limit error:', error);
            next();
        }
    };
}

module.exports = createRateLimiter;

