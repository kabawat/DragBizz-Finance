const { parseHashedWebhook, hostedEvent, statusEventType } = require('@src/lib/payment/form');
const { responseHash } = require('./hash');

function parseWebhook(_client, config, { body }) {
    return parseHashedWebhook(config, body, responseHash, (payload) => {
        const status = String(payload.status).toLowerCase();
        return hostedEvent(payload, {
            type: statusEventType(status, { cancelled: ['usercancelled'] }),
            gatewayPaymentId: payload.easepayid || payload.easebuzz_id,
            failureReason: payload.error_Message || payload.error,
            failureCode: payload.error
        });
    });
}

module.exports = { parseWebhook };
