const crypto = require("crypto");


function getWhitelistedIPs() {
    const raw = process.env.ALLOWED_IPS || "127.0.0.1,::1";
    return raw.split(",").map((ip) => ip.trim()).filter(Boolean);
}

let _cachedWhitelist = null;

/**
 * Check if an IPv4 address is within a CIDR range.
 * @param {string} ip - IPv4 address (e.g. "172.18.0.3")
 * @param {string} cidr - CIDR notation (e.g. "172.16.0.0/12")
 * @returns {boolean}
 */
function isIPInCIDR(ip, cidr) {
    const parts = cidr.split("/");
    if (parts.length !== 2) return false;
    const [range, bitsStr] = parts;
    const bits = parseInt(bitsStr, 10);
    if (isNaN(bits) || bits < 0 || bits > 32) return false;

    const ipParts = ip.split(".");
    if (ipParts.length !== 4) return false;
    const ipInt = ipParts.reduce((acc, p) => (acc << 8) + (parseInt(p, 10) || 0), 0) >>> 0;

    const rangeParts = range.split(".");
    if (rangeParts.length !== 4) return false;
    const rangeInt = rangeParts.reduce((acc, p) => (acc << 8) + (parseInt(p, 10) || 0), 0) >>> 0;

    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ipInt & mask) === (rangeInt & mask);
}

function isIPWhitelisted(ip) {
    if (!ip || typeof ip !== "string") return false;
    const trimmed = ip.trim();
    if (!trimmed) return false;

    if (!_cachedWhitelist) {
        _cachedWhitelist = getWhitelistedIPs();
    }

    if (_cachedWhitelist.includes(trimmed)) return true;

    for (const entry of _cachedWhitelist) {
        if (entry.includes("/") && isIPInCIDR(trimmed, entry)) return true;
    }

    return false;
}

function timingSafeEqual(a, b) {
    if (typeof a !== "string" || typeof b !== "string") return false;
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) return false;
    if (bufA.length === 0) return true;
    return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Validate X-Internal-Secret header against configured INTERNAL_SERVICE_SECRET.
 * Uses constant-time comparison to prevent timing attacks.
 * @param {import("express").Request} req
 * @returns {boolean}
 */
function hasValidInternalSecret(req) {
    const secret = process.env.INTERNAL_SERVICE_SECRET;
    if (!secret || secret.length < 16) return false;

    const headerSecret = req.headers["x-internal-secret"];
    if (!headerSecret || typeof headerSecret !== "string") return false;

    return timingSafeEqual(headerSecret.trim(), secret);
}

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
