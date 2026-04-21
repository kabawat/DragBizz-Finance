const { verifyWebhookSignature } = require('@src/utils/payment/razorpay.verify');
const Response = require('@src/utils/responseHandler/standardized');
const logger = require('@src/utils/logger');
const WebhookService = require('@src/services/payment/webhook');

async function razorpayWebhookController(req, res) {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
        return Response.validationError(res, 'Webhook signature missing');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
        return Response.validationError(res, 'Raw body missing for signature verification');
    }

    const isValidSignature = verifyWebhookSignature(rawBody, signature);
    if (!isValidSignature) {
        logger.warn('Invalid webhook signature attempt');
        return Response.validationError(res, 'Invalid webhook signature');
    }

    const { event, payload } = req.body;

    // Acknowledge unknown events early — no retry needed
    const HANDLED_EVENTS = ['payment.captured', 'payment.failed', 'order.paid', 'refund.created', 'refund.processed'];
    if (!HANDLED_EVENTS.includes(event)) {
        logger.warn(`Unhandled webhook event: ${event}`);
        return res.status(200).json({ received: true });
    }

    try {
        switch (event) {
            case 'payment.captured':
                await WebhookService.handlePaymentCaptured(payload);
                break;
            case 'payment.failed':
                await WebhookService.handlePaymentFailed(payload);
                break;
            case 'order.paid':
                await WebhookService.handleOrderPaid(payload);
                break;
            case 'refund.created':
                await WebhookService.handleRefundCreated(payload);
                break;
            case 'refund.processed':
                await WebhookService.handleRefundProcessed(payload);
                break;
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        // Return 500 so Razorpay retries the event — DO NOT swallow fatal errors
        logger.error(`Webhook handler fatal error [${event}]`, { error: error.message, stack: error.stack });
        return res.status(500).json({ received: false, error: 'Internal processing error' });
    }
}

module.exports = razorpayWebhookController;
