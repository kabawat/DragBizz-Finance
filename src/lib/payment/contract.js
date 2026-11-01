/**
 * @typedef {object} GatewayOrder
 * @property {string} gatewayOrderId
 * @property {object} checkout
 * @property {object} persistence
 * @property {object} raw
 *
 * @typedef {object} GatewayVerification
 * @property {string} status
 * @property {string|null} gatewayOrderId
 * @property {string|null} gatewayPaymentId
 * @property {number|null} amount
 * @property {string|null} currency
 * @property {string|null} paymentMethod
 * @property {Date|null} paidAt
 * @property {object} persistence
 * @property {object} raw
 *
 * @typedef {object} NormalizedEvent
 * @property {string} type
 * @property {string|null} gatewayOrderId
 * @property {string|null} gatewayPaymentId
 * @property {string|null} merchantOrderId
 * @property {number|null} amount
 * @property {number|null} refundAmount
 * @property {string|null} currency
 * @property {string|null} paymentMethod
 * @property {string|null} failureReason
 * @property {string|null} failureCode
 * @property {Date|null} occurredAt
 * @property {object} raw
 */

const REQUIRED_METHODS = [
    'createOrder',
    'verifyPayment',
    'getPaymentStatus',
    'capturePayment',
    'refund',
    'parseWebhook',
    'validateVerificationInput'
];

function assertGatewayContract(gateway) {
    if (!gateway || typeof gateway.id !== 'string' || typeof gateway.schemaId !== 'string') {
        throw new Error('Payment gateway adapter is missing id or schemaId');
    }
    for (const method of REQUIRED_METHODS) {
        if (typeof gateway[method] !== 'function') {
            throw new Error(`Payment gateway "${gateway.id}" does not implement ${method}`);
        }
    }
    return gateway;
}

module.exports = {
    assertGatewayContract
};
