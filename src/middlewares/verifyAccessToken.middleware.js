const { extractBearerToken, verifyAccessToken } = require("@src/lib/token");
const Response = require("@src/utils/responseHandler/standardized");

const accessMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];
        const token = extractBearerToken(authHeader);

        if (!token) {
            return Response.validationError(res, "Access token missing or invalid.");
        }

        const { valid, expired, decoded } = await verifyAccessToken(token);
        console.log("decoded", decoded);
        console.log("valid", valid);
        console.log("expired", expired);    
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