const { createPackagePayment } = require('@src/services/payment/subscription/checkout.service');
const { validateCreateOrder } = require('@src/utils/validations/payment.validation');
const { sanitizeCreateOrderData } = require('@src/utils/sanitizer/payment.sanitizer');
const { serializeOrderResponse } = require('@src/utils/serializer/payment.serializer');
const { successResponse } = require("@src/utils/responseHandler/success");
const { errorResponse, parseErrorForResponse } = require("@src/utils/responseHandler/error");
const STATUS_CODES = require("@src/constants/statusCode");
const logger = require("@src/utils/logger");

// Create payment order controller
async function createOrderController(req, res) {
    try {
        const userId = req.user?.sub;
        const agencyId = req.user?.agencyId;

        if (!userId) {
            return errorResponse(res, {
                message: 'User ID not found in token',
                statusCode: STATUS_CODES.UNAUTHORIZED
            });
        }

        if (!agencyId) {
            return errorResponse(res, {
                message: 'Agency context missing from token. Please re-login.',
                statusCode: STATUS_CODES.UNAUTHORIZED
            });
        }

        // Sanitize and validate input
        const sanitizedData = sanitizeCreateOrderData(req.body);
        logger.info("subscription_payment.create_order", {
            userId,
            agencyId,
            packageId: sanitizedData.packageId,
            months: sanitizedData.months,
            hasEmail: Boolean(sanitizedData.email),
            hasPhone: Boolean(sanitizedData.phone),
            gateway: process.env.PAYMENT_GATEWAY || "razorpay",
        });
        const validation = validateCreateOrder(sanitizedData);
        if (!validation.isValid) {
            logger.warn("subscription_payment.validation_failed", { fieldCount: Object.keys(validation.errors || {}).length });
            return errorResponse(res, {
                message: 'Validation failed',
                fields: validation.errors,
                statusCode: STATUS_CODES.BAD_REQUEST
            });
        }

        const orderData = await createPackagePayment({
            userId,
            agencyId,
            ...sanitizedData,
            idempotencyKey: req.idempotencyKey,
            ipAddress: req.clientIp,
            userAgent: req.userAgent
        });

        logger.info("subscription_payment.order_created", {
            orderId: orderData?.orderId,
            gateway: orderData?.gateway || orderData?.checkout?.gateway,
            gatewayOrderId: orderData?.gatewayOrderId || orderData?.checkout?.gatewayOrderId,
            amount: orderData?.amount,
            currency: orderData?.currency,
            hasCheckout: Boolean(orderData?.checkout),
        });

        if (!orderData) {
            return errorResponse(res, {
                message: 'Failed to create payment order',
                error: 'Order creation returned no data',
                statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR
            });
        }

        // Success response
        const responseData = serializeOrderResponse(orderData);
        return successResponse(res, {
            message: 'Payment order created successfully',
            data: responseData,
            statusCode: STATUS_CODES.CREATED
        });

    } catch (error) {
        logger.error("subscription_payment.create_order_failed", {
            message: error?.message,
            code: error?.code,
            statusCode: error?.statusCode,
        });
        // Handle specific error cases
        if (error.statusCode === 404 || error.message === 'Package not found or not available') {
            return errorResponse(res, {
                message: error.message,
                fields: error.fields,
                statusCode: STATUS_CODES.NOT_FOUND
            });
        }
        if (error.statusCode === 400 || error.message.includes('billing cycle') || error.message.includes('phone number') || error.message.includes('Unsupported payment gateway')) {
            return errorResponse(res, {
                message: error.message,
                fields: error.fields,
                statusCode: STATUS_CODES.BAD_REQUEST
            });
        }

        // Handle other errors
        return errorResponse(res, parseErrorForResponse(error));
    }
}

module.exports = createOrderController;

