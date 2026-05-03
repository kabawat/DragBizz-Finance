const { redisClient } = require('@src/config/redis.config');
const Response = require('@src/utils/responseHandler/standardized');
const logger = require('@src/utils/logger');
const SECRET = require('@src/config/env.config');

function createRateLimiter(options = {}) {
    const { limit = 10, windowSec = 60, prefix = 'rl' } = options;

    return async (req, res, next) => {
        try {
            if (!redisClient || !redisClient.isOpen) {
                if (SECRET.ENVIRONMENT === 'production') {
                    return Response.error(res, {
                        message: 'Rate limiter unavailable. Please try again later.',
                        statusCode: 503
                    });
                }
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
            // Log error but don't block requests if rate limiting fails
            logger.warn('[RateLimit] Error', { error: error?.message });
            if (SECRET.ENVIRONMENT === 'production') {
                return Response.error(res, {
                    message: 'Rate limiter unavailable. Please try again later.',
                    statusCode: 503
                });
            }
            return next();
        }
    };
}

module.exports = createRateLimiter;

