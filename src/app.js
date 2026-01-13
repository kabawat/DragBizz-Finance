const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const specs = require("./swagger");
const swaggerUi = require("swagger-ui-express");
const SECRET = require("@config/env.config");
const router = require("@routes/");

const app = express();

const isProduction = SECRET.ENVIRONMENT === "production";
const allowedOrigins = SECRET.server.allowedOrigins.split(",").map(o => o.trim());

const { applySecurityMiddleware } = require("@config/security.config");
applySecurityMiddleware(app);
app.use(express.json({ limit: "10mb" }));
app.use(morgan(isProduction ? "combined" : "dev"));
app.use(
  cors({
      origin: (origin, callback) => {
          if (!origin) {
              return callback(null, true);
          }

          const selfUrl = SECRET?.server?.url;
          const isSelf = selfUrl && origin === selfUrl;

          const isLocalhostWildcard = !isProduction && (
              /^http:\/\/localhost(:\d+)?\/?$/.test(origin) || 
              origin.startsWith('http://localhost') ||
              origin.startsWith('http://127.0.0.1')
          );

          const allowAllInDev = !isProduction;

          const isAllowed = isSelf || isLocalhostWildcard || allowAllInDev || allowedOrigins.includes(origin);
          
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

