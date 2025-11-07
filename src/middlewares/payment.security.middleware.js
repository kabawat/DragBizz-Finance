const { checkIdempotency } = require('@src/utils/security/idempotency');
const Response = require('@src/utils/responseHandler/standardized');

async function paymentSecurityMiddleware(req, res, next) {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            return Response.validationError(res, 'User ID not found in token');
        }

        const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;

        if (idempotencyKey) {
            const idempotencyCheck = await checkIdempotency(idempotencyKey, userId);
            if (idempotencyCheck.isDuplicate) {
                return Response.success(res, {
                    message: 'Duplicate request detected',
                    data: {
                        payment: idempotencyCheck.payment,
                        isDuplicate: true
                    }
                });
            }
            req.idempotencyKey = idempotencyKey;
        }

        req.clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
        req.userAgent = req.headers['user-agent'];

        next();
    } catch (error) {
        return Response.handleError(res, error, 'paymentSecurityMiddleware');
    }
}

module.exports = paymentSecurityMiddleware;

