const { AuditLogModel } = require('@src/models');

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
        console.error('Error logging audit event:', error);
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
        console.error('Error logging audit event:', error);
    }
}

module.exports = {
    logPaymentEvent,
    logSubscriptionEvent
};

