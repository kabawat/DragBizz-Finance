const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");
const specs = require("./swagger");
const swaggerUi = require("swagger-ui-express");
const SECRET = require("@config/env.config");
const router = require("@routes/");

const app = express();
app.use(cookieParser());

const isProduction = SECRET.ENVIRONMENT === "production";
const isDevelopment = SECRET.ENVIRONMENT === "development";

const { applySecurityMiddleware } = require("@config/security.config");
applySecurityMiddleware(app);
app.use(express.json({
  limit: "10mb",
  verify: (req, res, buf) => {
    // Save raw body for webhook verification before it gets parsed
    if (req.originalUrl && req.originalUrl.includes('/webhooks')) {
      req.rawBody = buf.toString();
    }
  }
}));
app.use(morgan(isProduction ? "combined" : "dev"));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      // Development: allow all origins
      if (isDevelopment) {
        return callback(null, true);
      }

      // Staging & Production: only origins from .env ALLOWED_ORIGINS
      const allowedList = (SECRET.server.allowedOrigins || "")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
      const isAllowed = allowedList.includes(origin);

      return callback(isAllowed ? null : new Error("Not allowed by CORS"), isAllowed);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "ngrok-skip-browser-warning", "Idempotency-Key"],
    exposedHeaders: ["Content-Length", "Content-Type"],
    credentials: true,
    optionsSuccessStatus: 200,
    preflightContinue: false,
    maxAge: 86400,
  })
);

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/", router);

if (!isProduction) {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));
}

module.exports = app;

