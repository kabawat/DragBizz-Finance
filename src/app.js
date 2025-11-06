const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const specs = require("./swagger");
const swaggerUi = require("swagger-ui-express");
const SECRET = require("@config/env.config");
const router = require("@routes/");

const app = express();

const isProduction = SECRET.ENVIRONMENT === "production";
const allowedOrigins = (process.env.ALLOWED_ORIGINS || (isProduction ? "https://dragbizz.com" : "http://localhost:3000,https://test.dragbizz.com")).split(",").map(o => o.trim());

app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(morgan(isProduction ? "combined" : "dev"));
app.use(
  cors({
      origin: (origin, callback) => {
          if (!origin) return callback(null, true);

          // Always allow server url itself
          const selfUrl = SECRET?.server?.url;
          const isSelf = selfUrl && origin === selfUrl;

          // In development, allow any localhost origin (any port)
          const isLocalhostWildcard = !isProduction && (/^http:\/\/localhost(:\d+)?\/?$/.test(origin) || origin.startsWith('http://localhost'));
          const isAllowed = isSelf || isLocalhostWildcard || allowedOrigins.includes(origin);
          
          return callback(isAllowed ? null : new Error("Not allowed by CORS"), isAllowed);
      },
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "ngrok-skip-browser-warning"],
      exposedHeaders: ["Content-Length", "Content-Type"],
      credentials: true, // Allow credentials (cookies, authorization headers)
      optionsSuccessStatus: 200,
      preflightContinue: false,
      maxAge: 86400, // 24 hours
  })
);

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/", router);

if (!isProduction) {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));
}

module.exports = app;

