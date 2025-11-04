const { ENVIRONMENT } = require("@config/env.config");
const STATUS_CODES = require("@src/constants/statusCode");

function handleControllerError(res, error, context = "Controller") {
    console.error(`❌ ${context} error:`, error?.message);

    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        status: false,
        message: "We're facing a technical glitch at the moment & couldn't submit your request.",
        error: ENVIRONMENT === "development" ? error?.message : undefined,
    });
}

module.exports = { handleControllerError };

