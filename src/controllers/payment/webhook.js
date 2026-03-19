const { verifyWebhookSignature } = require('@src/utils/payment/razorpay.verify');
const Response = require('@src/utils/responseHandler/standardized');
const logger = require('@src/utils/logger');
const WebhookService = require('@src/services/payment/webhook');

async function razorpayWebhookController(req, res) {
    try {
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

            default:
                logger.warn(`Unhandled webhook event: ${event}`);
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        return res.status(200).json({ received: true, error: error.message });
    }
}

module.exports = razorpayWebhookController;
