const utilityGrpcClient = require("@src/lib/grpc/clients/utility/utility.client");
const { jsToStruct } = require("@src/lib/grpc/utility/struct");

const EMAIL_TYPE_TO_PROTO = {
    OTP: "OTP",
    WELCOME: "WELCOME",
    RESET_PASSWORD: "RESET_PASSWORD",
    STORE_DELETE_OTP: "STORE_DELETE_OTP",
    LOGIN_SUCCESS: "LOGIN_SUCCESS",
    SUBSCRIPTION_SUCCESS: "SUBSCRIPTION_SUCCESS",
    CUSTOM: "CUSTOM",
    INVOICE_CREATED: "INVOICE_CREATED",
    ORDER_STATUS_UPDATE: "ORDER_STATUS_UPDATE",
    ORDER_OTP: "ORDER_OTP",
    STAFF_INVITATION: "STAFF_INVITATION",
    PAYMENT_REMINDER: "PAYMENT_REMINDER",
    LOW_STOCK_ALERT: "LOW_STOCK_ALERT",
};

// Send email using Utility service gRPC API
async function sendEmailService(email, type, payload) {
    const protoType = EMAIL_TYPE_TO_PROTO[type] || type;

    try {
        const response = await utilityGrpcClient.sendEmail({
            to: email,
            type: protoType,
            payload: jsToStruct(payload || {}),
        });

        return {
            success: Boolean(response?.success),
            message: response?.message || "",
            data: {
                jobId: response?.job_id || null,
                to: response?.to || email,
                type: response?.type || type,
                status: response?.status || "",
            },
        };
    } catch (error) {
        throw new Error(`Email Service gRPC Error: ${error?.message || "Unknown error"}`);
    }
}

module.exports = sendEmailService;
