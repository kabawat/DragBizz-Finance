const { GatewayEventType } = require('@src/lib/payment/events');
const { parseHashedWebhook, hostedEvent, statusEventType } = require('@src/lib/payment/form');
const { responseHash } = require('./hash');

function parseWebhook(_client, config, { body }) {
    return parseHashedWebhook(config, body, responseHash, (payload) => {
        const status = String(payload.status).toLowerCase();
        return hostedEvent(payload, {
            type: statusEventType(status, { fallback: GatewayEventType.PAYMENT_CANCELLED }),
            gatewayPaymentId: payload.mihpayid,
            failureReason: payload.error_Message || payload.field9,
            failureCode: payload.error
        });
    });
}

module.exports = { parseWebhook };
