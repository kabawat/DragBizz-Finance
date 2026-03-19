const { checkIdempotency } = require('@src/utils/security/idempotency');
const Response = require('@src/utils/responseHandler/standardized');

async function paymentSecurityMiddleware(req, res, next) {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            return Response.validationError(res, 'User ID not found in token');
        }

        let idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey;

        if (idempotencyKey) {
            if (typeof idempotencyKey !== 'string') {
                idempotencyKey = String(idempotencyKey);
            }
            req.idempotencyKey = idempotencyKey.substring(0, 100);
        }

        let rawIp = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'];
        if (Array.isArray(rawIp)) rawIp = rawIp[0];
        if (typeof rawIp === 'string') rawIp = rawIp.split(',')[0].trim();

        req.clientIp = typeof rawIp === 'string' ? rawIp.substring(0, 45) : 'unknown';
        req.userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].substring(0, 300) : 'unknown';

        next();
    } catch (error) {
        return Response.handleError(res, error, 'paymentSecurityMiddleware');
    }
}

module.exports = paymentSecurityMiddleware;

