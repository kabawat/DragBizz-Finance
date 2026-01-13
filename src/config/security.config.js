const helmet = require("helmet");
const SECRET = require("./env.config");

const isProduction = SECRET.ENVIRONMENT === "production";

function getSecurityConfig() {
    const helmetConfig = {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: isProduction ? [] : null,
            },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        },
        noSniff: true,
        xssFilter: true,
        referrerPolicy: { policy: "strict-origin-when-cross-origin" },
        frameguard: { action: "deny" },
        hidePoweredBy: true,
    };

    if (!isProduction) {
        helmetConfig.contentSecurityPolicy.directives.scriptSrc.push("'unsafe-inline'", "'unsafe-eval'");
        helmetConfig.contentSecurityPolicy.directives.styleSrc.push("'unsafe-inline'");
    }

    return helmetConfig;
}

function applySecurityMiddleware(app) {
    const securityConfig = getSecurityConfig();
    app.use(helmet(securityConfig));
}

module.exports = {
    getSecurityConfig,
    applySecurityMiddleware
};

