const SECRET = require("@config/env.config");

function csrfProtection(req, res, next) {
    const safeMethods = ["GET", "HEAD", "OPTIONS"];
    if (safeMethods.includes(req.method)) return next();

    const isProd = SECRET.ENVIRONMENT === "production";

    // Only enforce CSRF for cookie-authenticated requests
    const atCookie = req.cookies?.[isProd ? "__Host-at" : "at"];
    if (!atCookie) return next();

    // Never enforce CSRF for webhooks
    const path = req.path || req.originalUrl || "";
    if (path.includes("/webhooks")) return next();

    const csrfCookie = req.cookies?.csrf;
    const csrfHeader = req.headers["x-csrf-token"];
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return res.status(403).json({
            status: false,
            message: "Action not allowed.",
            error: "CSRF_VALIDATION_FAILED",
        });
    }

    return next();
}

module.exports = csrfProtection;

