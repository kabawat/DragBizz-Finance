const utilityGrpcClient = require('@src/lib/grpc/clients/utility/utility.client');
const { jsToStruct } = require('@src/lib/grpc/utility/struct');

const EMAIL_TYPES = {
    OTP: 'OTP',
    WELCOME: 'WELCOME',
    RESET_PASSWORD: 'RESET_PASSWORD',
    STORE_DELETE_OTP: 'STORE_DELETE_OTP',
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    SUBSCRIPTION_SUCCESS: 'SUBSCRIPTION_SUCCESS',
    CUSTOM: 'CUSTOM',
    INVOICE_CREATED: 'INVOICE_CREATED',
    ORDER_STATUS_UPDATE: 'ORDER_STATUS_UPDATE',
    ORDER_OTP: 'ORDER_OTP',
    STAFF_INVITATION: 'STAFF_INVITATION',
    PAYMENT_REMINDER: 'PAYMENT_REMINDER',
    LOW_STOCK_ALERT: 'LOW_STOCK_ALERT',
};

async function sendEmail(target, type, payload) {
    const to = typeof target === 'object' && target !== null && !Array.isArray(target) ? target.to : target;
    const emailType = typeof target === 'object' && target !== null && !Array.isArray(target) ? target.type : type;
    const emailPayload = typeof target === 'object' && target !== null && !Array.isArray(target) ? target.payload : payload;

    const protoType = EMAIL_TYPES[emailType] || emailType;

    try {
        const response = await utilityGrpcClient.sendEmail({
            to,
            type: protoType,
            payload: jsToStruct(emailPayload || {}),
        });

        return {
            success: Boolean(response?.success),
            message: response?.message || '',
            data: {
                jobId: response?.job_id || null,
                to: response?.to || to,
                type: response?.type || emailType,
                status: response?.status || '',
            },
        };
    } catch (error) {
        throw new Error(`Email gRPC Error: ${error?.message || 'Unknown error'}`);
    }
}

module.exports = {
    sendEmail,
};
