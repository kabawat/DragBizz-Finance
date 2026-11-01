const { verifyPayment } = require('@src/services/payment/subscription/verify.service');
const { getSummary } = require('@src/services/payment/subscription/summary.service');
const { validateVerifyPayment } = require('@src/utils/validations/payment.validation');
const { sanitizeVerifyPaymentData } = require('@src/utils/sanitizer/payment.sanitizer');
const { serializePayment } = require('@src/utils/serializer/payment.serializer');
const { successResponse } = require("@src/utils/responseHandler/success");
const { errorResponse, parseErrorForResponse } = require("@src/utils/responseHandler/error");
const STATUS_CODES = require("@src/constants/statusCode");

// Verify payment controller
async function verifyPaymentController(req, res) {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            return errorResponse(res, {
                message: 'User ID not found in token',
                statusCode: STATUS_CODES.UNAUTHORIZED
            });
        }

        // Sanitize and validate input
        const sanitizedData = sanitizeVerifyPaymentData(req.body);
        const validation = validateVerifyPayment(sanitizedData);
        if (!validation.isValid) {
            return errorResponse(res, {
                message: 'Validation failed',
                fields: validation.errors,
                statusCode: STATUS_CODES.BAD_REQUEST
            });
        }

        // Verify payment with service
        const payment = await verifyPayment({
            ...sanitizedData,
            ipAddress: req.clientIp,
            userAgent: req.userAgent
        });

        // Check ownership
        if (payment.userId !== userId) {
            return errorResponse(res, {
                message: 'You are not authorized to verify this payment',
                statusCode: STATUS_CODES.FORBIDDEN
            });
        }

        const subscription = await getSummary({
            payment,
        });

        const responseData = {
            payment: serializePayment(payment),
            subscription
        };

        return successResponse(res, {
            message: payment.status === 'SUCCESS'
                ? 'Payment verified successfully.'
                : 'Payment verification completed',
            data: responseData
        });

    } catch (error) {
        // Handle specific error cases
        if (error.message === 'Invalid payment signature' || error.code === 'PAYMENT_PENDING' || error.code === 'AMOUNT_MISMATCH') {
            return errorResponse(res, {
                message: error.message,
                statusCode: STATUS_CODES.BAD_REQUEST
            });
        }
        if (error.message.includes('not found')) {
            return errorResponse(res, {
                message: error.message,
                statusCode: STATUS_CODES.NOT_FOUND
            });
        }

        // Handle other errors
        return errorResponse(res, parseErrorForResponse(error));
    }
}

module.exports = verifyPaymentController;
