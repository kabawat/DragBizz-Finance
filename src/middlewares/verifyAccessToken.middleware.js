const { extractBearerToken, verifyAccessToken } = require("@src/lib/token");
const Response = require("@src/utils/responseHandler/standardized");
const STATUS_CODES = require("@src/constants/statusCode");
const { isIPWhitelisted, hasValidInternalSecret, getClientIP } = require("@src/utils/internalAuth");
const SECRET = require("@src/config/env.config");
const isProd = SECRET.ENVIRONMENT === "production";

const accessMiddleware = async (req, res, next) => {
    try {
        let token = req.cookies[isProd ? "__Host-at" : "at"];
        if (token) {
            const result = await verifyAccessToken(token);
            const { valid, expired, decoded } = result;
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
            return next();
        }

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
        next();
    } catch (err) {
        return Response.handleError(res, err, "accessMiddleware");
    }
};

module.exports = accessMiddleware;