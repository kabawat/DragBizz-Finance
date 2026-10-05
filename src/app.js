const express = require("express");
const cookieParser = require("cookie-parser");
const checkOrigin = require("@src/utils/checkOrigin");
const morgan = require("morgan");
const specs = require("./swagger");
const swaggerUi = require("swagger-ui-express");
const SECRET = require("@config/env.config");
const router = require("@routes/");

const app = express();
app.use(cookieParser());

const isProduction = SECRET.ENVIRONMENT === "production";

const { applySecurityMiddleware } = require("@config/security.config");
applySecurityMiddleware(app);
function captureWebhookBody(req, res, buf) {
  const path = req.originalUrl || req.url || '';
  if (path.includes('/webhooks')) {
    req.rawBody = buf.toString('utf8');
  }
}

app.use(express.json({ limit: "10mb", verify: captureWebhookBody }));
app.use(express.urlencoded({ extended: false, limit: "1mb", verify: captureWebhookBody }));
app.set("trust proxy", true);
app.use(morgan(isProduction ? "combined" : "dev"));
app.use(checkOrigin());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/", router);

if (!isProduction) {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));
}

module.exports = app;

