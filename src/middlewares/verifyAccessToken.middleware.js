const { extractBearerToken, verifyAccessToken } = require("@src/lib/token");
const Response = require("@src/utils/responseHandler/standardized");
const STATUS_CODES = require("@src/constants/statusCode");
const { isIPWhitelisted, hasValidInternalSecret, getClientIP } = require("@src/utils/internalAuth");
const SECRET = require("@src/config/env.config");

const LOG = "[SUB_ACTIVE]";

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
            req.user = decoded;
            req.tenant = decoded?.tenant;
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

        req.user = decoded;
        req.tenant = decoded?.tenant;
        console.log(`${LOG} [4] accessMiddleware: bearer OK, calling next()`);
        next();
    } catch (err) {
        console.log(`${LOG} [ERR] accessMiddleware:`, err.message);
        return Response.handleError(res, err, "accessMiddleware");
    }
};

module.exports = accessMiddleware;
