const crypto = require('crypto');

function hmac(secret, payload, encoding) {
    return crypto.createHmac('sha256', secret).update(payload).digest(encoding);
}

function sha512(payload) {
    return crypto.createHash('sha512').update(payload).digest('hex');
}

function timingSafeEqualText(expected, actual) {
    const expectedBuf = Buffer.from(String(expected));
    const actualBuf = Buffer.from(String(actual));
    if (expectedBuf.length !== actualBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

function timingSafeEqualHex(expectedHex, actualHex) {
    if (typeof actualHex !== 'string' || expectedHex.length !== actualHex.length) return false;
    try {
        return crypto.timingSafeEqual(Buffer.from(expectedHex, 'hex'), Buffer.from(actualHex, 'hex'));
    } catch {
        return false;
    }
}

module.exports = {
    hmac,
    sha512,
    timingSafeEqualText,
    timingSafeEqualHex
};
