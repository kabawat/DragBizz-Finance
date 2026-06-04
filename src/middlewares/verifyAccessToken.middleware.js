const { extractBearerToken, verifyAccessToken, normalizeAccessClaims } = require("@src/lib/token");
const Response = require("@src/utils/responseHandler/standardized");
const STATUS_CODES = require("@src/constants/statusCode");
const { isIPWhitelisted, hasValidInternalSecret, getClientIP } = require("@src/utils/internalAuth");
const { getCache } = require("@src/services/cache.service");
const SECRET = require("@src/config/env.config");

const LOG = "[SUB_ACTIVE]";

async function assertTokenVersion(decoded) {
    const userId = decoded?.sub;
    if (!userId) return null;

    const cacheKey = `user:tv:${userId}`;
    let currentTv = await getCache(cacheKey);

    if (currentTv !== null && typeof currentTv === "object" && currentTv !== undefined) {
        currentTv = Number(currentTv);
    }

    const tokenTv = Number(decoded.tv || 0);
    if (currentTv !== null && currentTv !== undefined && tokenTv !== Number(currentTv)) {
        return "Session expired. Please refresh or log in again.";
    }
    return null;
}

function attachUser(req, decoded) {
    req.user = normalizeAccessClaims(decoded);
    req.tenant = req.user?.tenant;
}

const accessMiddleware = async (req, res, next) => {
    try {
        console.log(`${LOG} [1] accessMiddleware: start`, { path: req.originalUrl, method: req.method });

        let token = req.cookies.at || req.cookies["__Host-at"];
        if (token) {
            console.log(`${LOG} [2] accessMiddleware: cookie token found, verifying...`);
            const result = await verifyAccessToken(token);
            const { valid, expired, decoded } = result;
            console.log(`${LOG} [3] accessMiddleware: verify result`, {
                valid,
                expired,
                sub: decoded?.sub,
                agencyId: decoded?.agencyId,
                tenant: decoded?.tenant,
                role: decoded?.role,
            });
            if (!valid) {
                console.log(`${LOG} [3a] accessMiddleware: STOP invalid/expired token`);
                return Response.validationError(
                    res,
                    expired ? "Access token expired." : "Invalid access token.",
                    {},
                    STATUS_CODES.UNAUTHORIZED
                );
            }
            const tvError = await assertTokenVersion(decoded);
            if (tvError) {
                console.log(`${LOG} [3b] accessMiddleware: STOP tokenVersion mismatch`);
                return Response.validationError(res, tvError, {}, STATUS_CODES.UNAUTHORIZED);
            }
            attachUser(req, decoded);
            console.log(`${LOG} [4] accessMiddleware: OK, calling next()`);
            return next();
        }

        console.log(`${LOG} [2b] accessMiddleware: no cookie token, trying bearer/internal`);
        const clientIP = getClientIP(req);
        if (!isIPWhitelisted(clientIP)) {
            return Response.validationError(res, "Access token missing or invalid.", {}, STATUS_CODES.UNAUTHORIZED);
        }

        if (SECRET.internalServiceSecret && !hasValidInternalSecret(req)) {
            return Response.validationError(res, "Access token missing or invalid.", {}, STATUS_CODES.UNAUTHORIZED);
        }

        token = extractBearerToken(req.headers["authorization"]);
        if (!token) {
            return Response.validationError(res, "Access token missing or invalid.", {}, STATUS_CODES.UNAUTHORIZED);
        }

        const bearerResult = await verifyAccessToken(token);
        const { valid, expired, decoded } = bearerResult;
        if (!valid) {
            return Response.validationError(
                res,
                expired ? "Access token expired." : "Invalid access token.",
                {},
                STATUS_CODES.UNAUTHORIZED
            );
        }

        const tvError = await assertTokenVersion(decoded);
        if (tvError) {
            return Response.validationError(res, tvError, {}, STATUS_CODES.UNAUTHORIZED);
        }
        attachUser(req, decoded);
        console.log(`${LOG} [4] accessMiddleware: bearer OK, calling next()`);
        next();
    } catch (err) {
        console.log(`${LOG} [ERR] accessMiddleware:`, err.message);
        return Response.handleError(res, err, "accessMiddleware");
    }
};

module.exports = accessMiddleware;
