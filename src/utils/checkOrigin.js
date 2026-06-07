const cors = require("cors");
const logger = require("./logger");
const SECRET = require("@config/env.config");
const { isOriginAllowed } = require("./origin.helper");

function checkOrigin() {
    const isDevelopment = SECRET.ENVIRONMENT === "development";
    const isProduction = SECRET.ENVIRONMENT === "production";

    return cors({
        origin: (origin, callback) => {
            const allowed = isOriginAllowed(origin, {
                allowedOrigins: SECRET.server.allowedOrigins,
                hostname: SECRET.server.hostname,
                isDevelopment,
                requireHttps: isProduction,
                corsAllowAll: SECRET.server.corsAllowAll,
            });

            if (!allowed) {
                logger?.debug?.(`CORS blocked: ${origin}`);
                return callback(null, false);
            }

            return callback(null, origin || true);
        },
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "Accept",
            "X-Client-Platform",
            "X-Platform",
            "X-DragBizz-Client",
            "ngrok-skip-browser-warning",
            "Idempotency-Key",
        ],
        exposedHeaders: ["Content-Length", "Content-Type"],
        credentials: true,
        optionsSuccessStatus: 200,
        preflightContinue: false,
        maxAge: 86400,
    });
}

module.exports = checkOrigin;
