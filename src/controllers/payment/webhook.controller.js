const Response = require('@src/utils/responseHandler/standardized');
const logger = require('@src/utils/logger');
const { handleWebhook } = require('@src/services/payment/subscription/webhook.service');

function createWebhookController(providerName) {
    return async function webhookController(req, res) {
        try {
            const result = await handleWebhook(providerName, req);
            return res.status(200).json(result);
        } catch (error) {
            logger.error('Payment webhook failed', {
                provider: providerName,
                error: error.message,
                code: error.code
            });
            if (error.statusCode === 400 || error.code === 'INVALID_SIGNATURE' || error.message?.includes('Unsupported payment gateway')) {
                return Response.validationError(res, error.message);
            }
            return res.status(500).json({ received: false, error: 'Internal processing error' });
        }
    };
}

module.exports = createWebhookController;
