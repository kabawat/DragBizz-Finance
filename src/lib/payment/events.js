const GatewayEventType = {
    PAYMENT_SUCCEEDED: 'payment.succeeded',
    PAYMENT_FAILED: 'payment.failed',
    PAYMENT_CANCELLED: 'payment.cancelled',
    REFUND_PENDING: 'refund.pending',
    REFUND_SUCCEEDED: 'refund.succeeded'
};

const PaymentStatus = {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
    REFUNDED: 'REFUNDED',
    PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED'
};

module.exports = {
    GatewayEventType,
    PaymentStatus
};
