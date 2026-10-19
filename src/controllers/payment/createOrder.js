const { createPackagePayment } = require('@src/services/payment/checkout.service');
const { validateCreateOrder } = require('@src/utils/validations/payment.validation');
const { sanitizeCreateOrderData } = require('@src/utils/sanitizer/payment.sanitizer');
const { serializeOrderResponse } = require('@src/utils/serializer/payment.serializer');
const { successResponse } = require("@src/utils/responseHandler/success");
const { errorResponse, parseErrorForResponse } = require("@src/utils/responseHandler/error");
const STATUS_CODES = require("@src/constants/statusCode");

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
        const validation = validateCreateOrder(sanitizedData);
        if (!validation.isValid) {
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

