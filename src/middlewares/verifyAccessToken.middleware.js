const SECRET = require("@config/env.config");
const { jwtVerify, createRemoteJWKSet } = require("jose");

const jwksUrl = new URL(`${SECRET?.server?.auth}/.well-known/jwks.json`);
if (SECRET?.ENVIRONMENT === 'production' && jwksUrl.protocol !== 'https:') {
  throw new Error("JWKS URL must use HTTPS in production");
}
const JWKS = createRemoteJWKSet(jwksUrl);

const extractBearerToken = (authHeader) => {
  if (!authHeader || typeof authHeader !== "string") return null;
  const parts = authHeader.split(" ");
  return parts.length === 2 && parts[0] === "Bearer" ? parts[1] : null;
};

const verifyAccessToken = async (token) => {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: SECRET?.jwt?.issuer,
    algorithms: [SECRET?.jwt?.algorithm],
    audience: SECRET?.jwt?.audience,
  });
  return payload;
};

const accessMiddleware = async (req, res, next) => {
  try {
    const token = extractBearerToken(req.headers["authorization"]);
    if (!token) return res.status(401).json({ status: false, message: "Unauthorized" });
    req.user = await verifyAccessToken(token);
    next();
  } catch (err) {
    const msg = err?.code === 'ERR_JWT_EXPIRED' ? 'Token expired' : 'Unauthorized';
    return res.status(401).json({ status: false, message: msg });
  }
};

module.exports = accessMiddleware;

