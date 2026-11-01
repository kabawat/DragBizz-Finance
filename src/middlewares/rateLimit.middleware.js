const { redisClient } = require('@src/config/redis.config');
const Response = require('@src/utils/responseHandler/standardized');
const logger = require('@src/utils/logger');

function createRateLimiter(options = {}) {
    const { limit = 10, windowSec = 60, prefix = 'rl' } = options;

    return async (req, res, next) => {
        try {
            if (!redisClient || !redisClient.isReady) {
                return Response.error(res, {
                    message: 'Rate limiter unavailable. Please try again later.',
                    statusCode: 503
                });
            }

            const userId = req.user?.sub || req.ip;
            const key = `${prefix}:${userId}`;

            const current = await redisClient.eval(`local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return n`, { keys: [key], arguments: [String(windowSec)] });

            if (current > limit) {
                return Response.error(res, {
                    message: 'Too many requests. Please try again later.',
                    statusCode: 429
                });
            }

            next();
        } catch (error) {
            logger.warn('[RateLimit] Error', { error: error?.message });
            return Response.error(res, {
                message: 'Rate limiter unavailable. Please try again later.',
                statusCode: 503
            });
        }
    };
}

module.exports = createRateLimiter;

