const { extractBearerToken, verifyAccessToken } = require("@src/lib/token");
const STATUS_CODES = require("@src/constants/statusCode");
const { handleControllerError } = require("@src/utils/responseHandler/error");

const SECRET = require("@src/config/env.config");
const isProduction = SECRET.ENVIRONMENT === "production";

const accessMiddleware = async (req, res, next) => {
    try {
        if (!isProduction) {
            console.log(`[accessMiddleware] ${req.method} ${req.path}`);
        }
        const authHeader = req.headers["authorization"];
        const token = extractBearerToken(authHeader);

        if (!token) {
            if (!isProduction) {
                console.log('[accessMiddleware] No token found');
            }
            return res.status(STATUS_CODES.UNAUTHORIZED).json({
                status: false,
                message: "Access token missing or invalid.",
            });
        }

        if (!isProduction) {
            console.log('[accessMiddleware] Verifying token...');
        }
        const { valid, expired, decoded } = await verifyAccessToken(token);
        
        if (!valid) {
            if (!isProduction) {
                console.log('[accessMiddleware] Token invalid:', expired ? 'expired' : 'invalid');
            }
            return res.status(STATUS_CODES.UNAUTHORIZED).json({
                status: false,
                message: expired ? "Access token expired." : "Invalid access token.",
            });
        }

        if (!isProduction) {
            console.log('[accessMiddleware] Token valid, user:', decoded.sub);
        }
        req.user = decoded;
        next();
    } catch (err) {
        console.error('[accessMiddleware] Error:', err.message);
        return handleControllerError(res, err, "accessMiddleware");
    }
};

module.exports = accessMiddleware;

