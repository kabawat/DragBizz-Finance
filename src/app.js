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
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const ok = allowedOrigins.includes(origin);
    return cb(ok ? null : new Error("Not allowed by CORS"), ok);
  },
  credentials: true
}));

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/", router);

if (!isProduction) {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));
}

module.exports = app;

