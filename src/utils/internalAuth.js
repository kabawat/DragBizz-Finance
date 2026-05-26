const SECRET = require("@src/config/env.config");
const crypto = require("crypto");
//Parse comma-separated IP whitelist from env
function getWhitelistedIPs() {
    const raw = SECRET.ALLOWED_IPS || "127.0.0.1,::1";
    return raw.split(",").map((ip) => ip.trim()).filter(Boolean);
}

let _cachedWhitelist = null;

function isIPWhitelisted(ip) {
    if (!ip || typeof ip !== "string") return false;
    const trimmed = ip.trim();
    if (!trimmed) return false;

    if (!_cachedWhitelist) {
        _cachedWhitelist = getWhitelistedIPs();
    }

    return _cachedWhitelist.includes(trimmed);
}

// Constant-time comparison to prevent timing attacks.
function timingSafeEqual(a, b) {
    if (typeof a !== "string" || typeof b !== "string") return false;
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) return false;
    if (bufA.length === 0) return true;
    return crypto.timingSafeEqual(bufA, bufB);
}

// Validate X-Internal-Secret header against configured internal service secret.
function hasValidInternalSecret(req) {
    const secret = SECRET.internalServiceSecret;
    if (!secret || secret.length < 16) return false;

    const headerSecret = req.headers["x-internal-secret"];
    if (!headerSecret || typeof headerSecret !== "string") return false;

    return timingSafeEqual(headerSecret.trim(), secret);
}

// Get client IP from request (X-Real-IP, X-Forwarded-For, or socket).
function getClientIP(req) {
    const xRealIP = req.headers["x-real-ip"];
    if (xRealIP && typeof xRealIP === "string") {
        return xRealIP.trim();
    }

    const xForwardedFor = req.headers["x-forwarded-for"];
    if (xForwardedFor && typeof xForwardedFor === "string") {
        const first = xForwardedFor.split(",")[0];
        return first ? first.trim() : "";
    }

    const remote = req.socket?.remoteAddress;
    if (remote) {
        return remote.replace(/^::ffff:/, "");
    }

    return "";
}

// Clear cached whitelist (e.g. for tests or hot-reload).
function clearWhitelistCache() {
    _cachedWhitelist = null;
}

module.exports = {
    isIPWhitelisted,
    hasValidInternalSecret,
    getClientIP,
    getWhitelistedIPs,
    clearWhitelistCache,
};
