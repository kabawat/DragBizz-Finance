const SECRET = require("@config/env.config");
const { jwtVerify, createRemoteJWKSet } = require("jose");
const crypto = require("crypto");
const { getCache, setCache } = require("@src/services/cache.service");
const logger = require("@src/utils/logger");

function resolveJwksUrl() {
    const explicit = SECRET?.server?.jwksUrl;
    if (explicit) {
        return new URL(explicit);
    }
    const base = SECRET?.server?.url;
    if (!base) {
        throw new Error("Set SERVER_URL or JWKS_URL for JWT verification (JWKS fetch).");
    }
    const normalized = String(base).replace(/\/$/, "");
    return new URL(`${normalized}/auth/.well-known/jwks.json`);
}

// 🔑 Remote JWKS config (Auth micro-service)
const jwksUrl = resolveJwksUrl();
if (SECRET?.ENVIRONMENT === "production" && jwksUrl.protocol !== "https:") {
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

// ✅ Verify public token (Auth micro-service, RS256) with Redis caching — same flow as dragbizz-retailer
async function verifyAccessToken(token) {
    try {
        // Step 1: Check Redis cache first
        const cacheKey = getTokenCacheKey(token);
        const cachedResult = await getCache(cacheKey);
        if (cachedResult) {
            return {
                valid: cachedResult.valid,
                expired: cachedResult.expired,
                decoded: cachedResult.decoded,
                cached: true
            };
        }

        // Step 2: Cache miss - verify via JWKS (jose auto-caches JWKS keys)
        const audience = SECRET?.jwt?.audience;

        const { payload } = await jwtVerify(token, JWKS, {
            issuer: SECRET?.jwt?.issuer,
            algorithms: [SECRET?.jwt?.algorithm],
            audience,
            clockTolerance: 60,
        });
        // Step 3: Cache successful verification
        const result = {
            valid: true,
            expired: false,
            decoded: payload,
            cached: false
        };

        await setCache(cacheKey, result, VERIFY_CACHE_TTL);

        return result;
    } catch (err) {
        if (err.code === "ERR_JWT_EXPIRED") {
            return { valid: false, expired: true, decoded: null, cached: false };
        }

        const msg = String(err?.message || "");
        if (msg.includes("JSON Web Key Set") || err?.code === "ERR_JOSE_GENERIC") {
            logger.warn("JWKS request failed (need HTTP 200). From this process, open JWKS_URL in a browser or curl.", {
                jwksUrl: jwksUrl.href,
                error: msg,
            });
        } else {    
            logger.warn("Token verification error", { error: msg || String(err) });
        }

        return { valid: false, expired: false, decoded: null, error: err, cached: false };
    }
}

module.exports = {
    verifyAccessToken,
    extractBearerToken,
};

