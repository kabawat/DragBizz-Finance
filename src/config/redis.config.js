// src/config/redis.config.js
const { createClient } = require("redis");
const SECRET = require("./env.config");
const logger = require("@src/utils/logger");

// Redis config
const redisConfig = {
    host: SECRET?.redis?.host || "127.0.0.1",
    port: SECRET?.redis?.port || 6379,
    password: SECRET?.redis?.password || undefined,
    db: SECRET?.redis?.db || 0,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    lazyConnect: true,
};

// Redis v4 client instance
const redisClient = createClient({
    socket: {
        host: redisConfig.host,
        port: redisConfig.port,
        reconnectStrategy: (retries) => {
            const delay = Math.min(retries * 200, 5000);
            if (retries < 10) {
                logger.warn(`Redis reconnection attempt ${retries}, retrying in ${delay}ms`);
            }
            return delay;
        },
        keepAlive: 30000,
        connectTimeout: 10000,
        lazyConnect: true,
    },
    password: redisConfig.password,
    database: redisConfig.db,
    name: "finance-redis-client",
    pingInterval: 30000,
    disableOfflineQueue: false,
    maxRetriesPerRequest: null,
});

// Connection events
redisClient.on("connect", () => {
    logger.info('Redis client connecting', { host: redisConfig.host, port: redisConfig.port });
});

redisClient.on("ready", () => {
    logger.info('Redis client ready');
});

redisClient.on("reconnecting", () => {
    logger.warn('Redis reconnecting...');
});

redisClient.on("end", () => {
    logger.warn('Redis connection closed');
});

redisClient.on("error", (err) => {
    logger.error('Redis connection error', { error: err.message, code: err.code });
});

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 20;

// Connect Redis
const connectRedis = async () => {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
            logger.info('Redis connection established', { host: redisConfig.host, port: redisConfig.port });
            reconnectAttempts = 0;
            
            // Configure Redis settings if possible
            try {
                await redisClient.configSet('maxmemory-policy', 'noeviction');
                await redisClient.configSet('tcp-keepalive', '60');
                await redisClient.configSet('timeout', '300');
            } catch (configError) {
                logger.warn('Redis config set failed', { error: configError.message });
            }
        }
    } catch (error) {
        reconnectAttempts++;
        logger.error('Redis connection failed', { 
            error: error.message, 
            code: error.code,
            attempt: reconnectAttempts,
            maxAttempts: MAX_RECONNECT_ATTEMPTS
        });
        
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            logger.info('Retrying Redis connection in 5 seconds...');
            setTimeout(() => {
                connectRedis();
            }, 5000);
        } else {
            logger.error('Max Redis reconnection attempts reached. Please check Redis service.');
        }
    }
};

// Graceful shutdown
const disconnectRedis = async () => {
    try {
        if (redisClient.isOpen) {
            await redisClient.quit();
            logger.info('Redis disconnected gracefully');
        }
    } catch (error) {
        logger.warn('Redis disconnect error', { error: error.message });
    }
};

// Health check function
const checkRedisHealth = async () => {
    try {
        if (!redisClient || !redisClient.isOpen) {
            return {
                status: 'unhealthy',
                error: 'Redis client not connected',
                timestamp: new Date().toISOString()
            };
        }
        
        const start = Date.now();
        await redisClient.ping();
        const latency = Date.now() - start;
        
        return {
            status: 'healthy',
            latency: `${latency}ms`,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

module.exports = {
    redisClient,
    connectRedis,
    disconnectRedis,
    redisConfig,
    checkRedisHealth,
};

