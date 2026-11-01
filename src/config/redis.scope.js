'use strict';

// Identical local copies keep independently built services self-contained.
const FIRST_KEY = new Set([
    'blPop', 'zAdd', 'zScan', 'zRemRangeByScore', 'get', 'set', 'setEx', 'ttl', 'pTTL', 'expire', 'pExpire', 'incr', 'incrBy',
    'decr', 'decrBy', 'hGetAll', 'hGet', 'hSet', 'hIncrBy', 'sAdd', 'sRem',
    'sMembers', 'sScan', 'lPush', 'lRange', 'lTrim', 'xAdd',
]);
const MANY_KEYS = new Set(['del', 'unlink', 'exists', 'mGet']);
const CHANNEL = new Set(['publish', 'subscribe', 'pSubscribe', 'unsubscribe', 'pUnsubscribe']);

function deadline(promise, timeoutMs) {
    // A timed-out write may still execute on the server; never retry it blindly.
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            const error = new Error('Redis command timed out; write outcome may be uncertain');
            error.code = 'REDIS_COMMAND_TIMEOUT';
            reject(error);
        }, timeoutMs);
        Promise.resolve(promise).then(value => {
            clearTimeout(timer); resolve(value);
        }, error => {
            clearTimeout(timer); reject(error);
        });
    });
}
function scopedClient(client, service, { transaction = false, commandTimeout = 3000 } = {}) {
    function key(value) {
        if (Array.isArray(value)) return value.map(key);
        if (typeof value !== 'string') throw new TypeError('Redis keys must be strings');
        return value.startsWith(`${service}:`) ? value : `${service}:${value}`;
    }
    let proxy;
    proxy = new Proxy(client, {
        get(target, name) {
            if (name === 'multi') return () => scopedClient(target.multi(), service, { transaction: true, commandTimeout });
            if (name === 'duplicate') return (...args) => scopedClient(target.duplicate(...args), service, { commandTimeout });
            if (name === 'sendCommand' || name === 'scan' || name === 'scanIterator') {
                return () => { throw new Error(`Unscoped Redis operation ${name} is disabled`); };
            }
            const member = Reflect.get(target, name, target);
            if (typeof member !== 'function') return member;
            return (...original) => {
                const args = [...original];
                if (FIRST_KEY.has(name) || MANY_KEYS.has(name)) args[0] = key(args[0]);
                else if (name === 'rename') { args[0] = key(args[0]); args[1] = key(args[1]); }
                else if (name === 'eval' || name === 'evalSha') {
                    args[1] = { ...args[1], keys: (args[1]?.keys || []).map(key) };
                } else if (CHANNEL.has(name) && args[0] !== undefined) {
                    // Utility may subscribe to this exact public integration channel only.
                    const channel = c => c === 'core:sync:changes' ? c : key(c);
                    args[0] = Array.isArray(args[0]) ? args[0].map(channel) : channel(args[0]);
                }
                const result = member.apply(target, args);
                if (transaction && result === target) return proxy;
                const isCommand = FIRST_KEY.has(name) || MANY_KEYS.has(name) || CHANNEL.has(name) ||
                    ['rename', 'eval', 'evalSha', 'ping', 'exec', 'execAsPipeline'].includes(name);
                return isCommand && result?.then ? deadline(result, commandTimeout) : result;
            };
        },
    });
    return proxy;
}

module.exports = { scopedClient };
