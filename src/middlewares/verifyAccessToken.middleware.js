const { verifyAccessToken, normalizeAccessClaims } = require("@src/lib/token");
const Response = require("@src/utils/responseHandler/standardized");
const STATUS_CODES = require("@src/constants/statusCode");
const { getCache } = require("@src/services/cache.service");
const { getAccessTokenFromRequest } = require("@src/utils/helper/requestToken.helper");

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
        const token = getAccessTokenFromRequest(req);
        if (!token) {
            return Response.validationError(res, "Access token missing or invalid.", {}, STATUS_CODES.UNAUTHORIZED);
        }

        const { valid, expired, decoded } = await verifyAccessToken(token);
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
        next();
    } catch (err) {
        return Response.handleError(res, err, "accessMiddleware");
    }
};

module.exports = accessMiddleware;
