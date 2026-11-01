const { createClient } = require('redis');
const { scopedClient } = require('./redis.scope');
const logger = require('@src/utils/logger');
const SECRET = require('./env.config');
const SERVICE = 'finance';

const positive = (name, fallback) => {
    const value = Number(process.env[name] || fallback);
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid ${name}`);
    return value;
};
if (Number(process.env.REDIS_DB || SECRET.redis?.db || 0) !== 0) {
    throw new Error('Central Redis requires DB 0');
}
const password = process.env.REDIS_PASSWORD || SECRET.redis?.password;
const username = process.env.REDIS_USERNAME || `${SERVICE}_user`;
if (!password || username !== `${SERVICE}_user`) {
    throw new Error(`Redis requires credentials for ${SERVICE}_user`);
}
const redisConfig = {
    host: process.env.REDIS_HOST || 'redis',
    port: positive('REDIS_PORT', 6379), username, password, db: 0,
    connectTimeout: positive('REDIS_CONNECT_TIMEOUT_MS', 5000),
    // BullMQ workers need unlimited request retries; producers override below.
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    retryStrategy: retries => Math.min(100 * 2 ** Math.min(retries, 6), 5000),
};
const options = {
    socket: {
        host: redisConfig.host, port: redisConfig.port,
        connectTimeout: redisConfig.connectTimeout, keepAlive: true,
        reconnectStrategy: retries => Math.min(100 * 2 ** Math.min(retries, 6), 5000) + Math.floor(Math.random() * 100),
    },
    username, password, database: 0, name: `dragbizz-${SERVICE}`,
    disableOfflineQueue: true, commandsQueueMaxLength: 1000,
};
const clients = new Set();
function createRedisClient() {
    const raw = createClient(options);
    clients.add(raw);
    raw.on('error', error => logger.error('Redis error', { service: SERVICE, error: error.message }));
    // Bound response latency as well as offline queueing; timed-out writes are uncertain.
    return scopedClient(raw, SERVICE, { commandTimeout: positive('REDIS_COMMAND_TIMEOUT_MS', 3000) });
}
const redisClient = createRedisClient();
let connecting;
async function connectRedis() {
    if (redisClient.isReady) return;
    if (!connecting) {
        connecting = redisClient.connect().catch(error => {
            connecting = undefined;
            logger.error('Redis startup failed', { service: SERVICE, error: error.message });
            throw error;
        });
    }
    return connecting;
}
async function disconnectRedis() {
    await Promise.all([...clients].map(async client => {
        if (!client.isOpen) return;
        if (client.isReady) {
            let timer;
            try {
                await Promise.race([
                    client.quit(),
                    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Redis shutdown timed out')), 3000); }),
                ]);
            } catch (error) {
                logger.warn('Redis shutdown failed', { error: error.message });
            } finally {
                clearTimeout(timer);
                if (client.isOpen) client.destroy();
            }
        } else client.destroy();
    }));
}
async function checkRedisHealth() {
    try {
        if (!redisClient.isReady) throw new Error('Redis not ready');
        const start = Date.now();
        await redisClient.ping();
        return { status: 'healthy', latency: `${Date.now() - start}ms`, timestamp: new Date().toISOString() };
    } catch (error) {
        return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
}
module.exports = { redisClient, redisConfig, createRedisClient, connectRedis, disconnectRedis, checkRedisHealth };
