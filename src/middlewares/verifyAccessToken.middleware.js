const { extractBearerToken, verifyAccessToken } = require("@src/lib/token");
const Response = require("@src/utils/responseHandler/standardized");
const SECRET = require("@src/config/env.config");
const isProd = SECRET.ENVIRONMENT === "production";

const accessMiddleware = async (req, res, next) => {
    try {
        let token = req.cookies[isProd ? "__Host-at" : "at"];

        if (!token) {
            return Response.validationError(res, "Access token missing or invalid.");
        }

        const { valid, expired, decoded } = await verifyAccessToken(token);
        if (!valid) {
            return Response.validationError(res, expired ? "Access token expired." : "Invalid access token.");
        }

        req.user = decoded;
        next();
    } catch (err) {
        return Response.handleError(res, err, "accessMiddleware");
    }
};

module.exports = accessMiddleware;