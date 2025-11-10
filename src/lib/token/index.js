const SECRET = require("@config/env.config");
const { jwtVerify, createRemoteJWKSet } = require("jose");
const crypto = require("crypto");
const { getCache, setCache } = require("@src/services/cache.service");

// 🔑 Remote JWKS config (Auth micro-service)
const jwksUrl = new URL(`${SECRET?.server?.url}/auth/.well-known/jwks.json`);
if (SECRET?.ENVIRONMENT === 'production' && jwksUrl.protocol !== 'https:') {
    throw new Error("JWKS URL must use HTTPS in production");
}
const JWKS = createRemoteJWKSet(jwksUrl);

// 🔐 Redis Cache Configuration for Token Verification
const VERIFY_CACHE_TTL = 300; // 5 minutes
const VERIFY_CACHE_PREFIX = "verify:token:";

// 📦 Generate cache key from token
function getTokenCacheKey(token) {
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    return `${VERIFY_CACHE_PREFIX}${hash}:subscription`;
}

// 📦 Extract Bearer token from Authorization header
const extractBearerToken = (authHeader) => {
    if (!authHeader || typeof authHeader !== "string") return null;
    const parts = authHeader.split(" ");
    return parts.length === 2 && parts[0] === "Bearer" ? parts[1] : null;
};

// Verify access token
async function verifyAccessToken(token) {
    try {
        // Check Redis cache first
        const cacheKey = getTokenCacheKey(token);
        const cachedResult = await getCache(cacheKey);
        console.log("cachedResult", cachedResult);
        if (cachedResult) {
            return {
                valid: cachedResult.valid,
                expired: cachedResult.expired,
                decoded: cachedResult.decoded,
                cached: true
            };
        }

        // Cache miss - verify via JWKS
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: SECRET?.jwt?.issuer,
            algorithms: [SECRET?.jwt?.algorithm],
            audience: Array.isArray(SECRET?.jwt?.audience) 
                ? SECRET.jwt.audience 
                : [SECRET?.jwt?.audience],
            clockTolerance: 60,
        });
        console.log("payload", payload);
        // Cache successful verification
        const result = {
            valid: true,
            expired: false,
            decoded: payload,
            cached: false
        };

        // Cache for 5 minutes
        await setCache(cacheKey, result, VERIFY_CACHE_TTL);

        return result;
    } catch (err) {
        console.log("err", err);
        // Handle expired tokens
        if (err.code === "ERR_JWT_EXPIRED") {
            return { valid: false, expired: true, decoded: null, cached: false };
        }
            
        // Cache invalid tokens
        return { valid: false, expired: false, decoded: null, error: err, cached: false };
    }
}

module.exports = {
    verifyAccessToken,
    extractBearerToken,
};

