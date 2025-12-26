const { redisClient } = require('@src/config/redis.config');
const Response = require('@src/utils/responseHandler/standardized');

function createRateLimiter(options = {}) {
    const { limit = 10, windowSec = 60, prefix = 'rl' } = options;

    return async (req, res, next) => {
        try {
            if (!redisClient || !redisClient.isOpen) {
                // If Redis is down, use in-memory fallback for critical protection
                // In production, we should still enforce some rate limiting
                if (process.env.NODE_ENV === 'production') {
                    // Use a simple in-memory rate limiter as fallback
                    const memoryKey = `mem:${prefix}:${req.user?.sub || req.ip}`;
                    if (!global.rateLimitMemory) {
                        global.rateLimitMemory = new Map();
                    }
                    
                    const memData = global.rateLimitMemory.get(memoryKey);
                    const now = Date.now();
                    
                    if (!memData || (now - memData.start) > (windowSec * 1000)) {
                        global.rateLimitMemory.set(memoryKey, { count: 1, start: now });
                        return next();
                    }
                    
                    if (memData.count >= limit) {
                        return Response.error(res, {
                            message: 'Too many requests. Please try again later.',
                            statusCode: 429
                        });
                    }
                    
                    memData.count++;
                    return next();
                }
                // In development, allow requests if Redis is down
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
            console.error('[RateLimit] Error:', error.message);
            // In production, still allow request but log the error
            // In development, allow request
            next();
        }
    };
}

module.exports = createRateLimiter;

