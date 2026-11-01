const { handleWebhook } = require('@src/services/payment/retail/webhook');

async function handleRetailWebhookController(req, res) {
    try {
        const result = await handleWebhook(req.params.provider, req);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.statusCode || 503).json({
            received: false,
            code: error.code || 'PROCESSING_UNAVAILABLE',
        });
    }
}

module.exports = {
    handleRetailWebhookController,
};

