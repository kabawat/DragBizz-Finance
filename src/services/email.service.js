const utilityGrpcClient = require("@src/lib/grpc/clients/utility/utility.client");
const { jsToStruct } = require("@src/lib/grpc/utility/struct");

const EMAIL_TYPE_TO_PROTO = {
    OTP: "EMAIL_TEMPLATE_OTP",
    WELCOME: "EMAIL_TEMPLATE_WELCOME",
    RESET_PASSWORD: "EMAIL_TEMPLATE_RESET_PASSWORD",
    STORE_DELETE_OTP: "EMAIL_TEMPLATE_STORE_DELETE_OTP",
    LOGIN_SUCCESS: "EMAIL_TEMPLATE_LOGIN_SUCCESS",
    SUBSCRIPTION_SUCCESS: "EMAIL_TEMPLATE_SUBSCRIPTION_SUCCESS",
    CUSTOM: "EMAIL_TEMPLATE_CUSTOM",
    INVOICE_CREATED: "EMAIL_TEMPLATE_INVOICE_CREATED",
    ORDER_STATUS_UPDATE: "EMAIL_TEMPLATE_ORDER_STATUS_UPDATE",
    ORDER_OTP: "EMAIL_TEMPLATE_ORDER_OTP",
    STAFF_INVITATION: "EMAIL_TEMPLATE_STAFF_INVITATION",
    PAYMENT_REMINDER: "EMAIL_TEMPLATE_PAYMENT_REMINDER",
    LOW_STOCK_ALERT: "EMAIL_TEMPLATE_LOW_STOCK_ALERT",
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
