const { AuditLogModel } = require('@src/models');
const logger = require('@src/utils/logger');

async function logPaymentEvent(eventType, data) {
    try {
        const auditLog = {
            eventType: String(eventType).substring(0, 50),
            entityType: 'PAYMENT',
            entityId: data.paymentId || data.orderId,
            userId: data.userId,
            action: String(eventType).substring(0, 50),
            details: {
                orderId: data.orderId,
                amount: data.amount,
                status: data.status,
                gateway: data.gateway || null
            },
            ipAddress: data.ipAddress ? String(data.ipAddress).substring(0, 45) : undefined,
            userAgent: data.userAgent ? String(data.userAgent).substring(0, 300) : undefined,
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
            eventType: String(eventType).substring(0, 50),
            entityType: 'SUBSCRIPTION',
            entityId: data.subscriptionId,
            userId: data.userId,
            action: String(eventType).substring(0, 50),
            details: {
                subscriptionId: data.subscriptionId,
                packageId: data.packageId,
                status: data.status,
                paymentId: data.paymentId
            },
            ipAddress: data.ipAddress ? String(data.ipAddress).substring(0, 45) : undefined,
            userAgent: data.userAgent ? String(data.userAgent).substring(0, 300) : undefined,
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

