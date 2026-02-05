const { AuditLogModel } = require('@src/models');
const logger = require('@src/utils/logger');

async function logPaymentEvent(eventType, data) {
    try {
        const auditLog = {
            eventType,
            entityType: 'PAYMENT',
            entityId: data.paymentId || data.orderId,
            userId: data.userId,
            action: eventType,
            details: {
                orderId: data.orderId,
                amount: data.amount,
                status: data.status,
                gateway: data.gateway || 'RAZORPAY'
            },
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            timestamp: new Date()
        };

        await AuditLogModel.create(auditLog);
    } catch (error) {
        logger.error('Error logging audit event', { error: error?.message, stack: error?.stack });
    }
}

async function logSubscriptionEvent(eventType, data) {
    try {
        const auditLog = {
            eventType,
            entityType: 'SUBSCRIPTION',
            entityId: data.subscriptionId,
            userId: data.userId,
            action: eventType,
            details: {
                subscriptionId: data.subscriptionId,
                packageId: data.packageId,
                status: data.status,
                paymentId: data.paymentId
            },
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            timestamp: new Date()
        };

        await AuditLogModel.create(auditLog);
    } catch (error) {
        logger.error('Error logging audit event', { error: error?.message, stack: error?.stack });
    }
}

module.exports = {
    logPaymentEvent,
    logSubscriptionEvent
};

