const PaymentService = require('@src/services/payment');
const SubscriptionService = require('@src/services/subscription');
const { PackageModel } = require('@src/models');
const { validateCreateOrder } = require('@src/utils/validations/payment.validation');
const { sanitizeCreateOrderData } = require('@src/utils/sanitizer/payment.sanitizer');
const { serializeOrderResponse } = require('@src/utils/serializer/payment.serializer');
const { comparePackages } = require('@src/services/subscription/helpers');
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

        // Check existing subscription logic
        const existingSubscription = await SubscriptionService.getActiveSubscription(userId, { agencyId });
        if (existingSubscription) {
            const newPackage = await PackageModel.findById(sanitizedData.packageId).lean();
            if (!newPackage) {
                return errorResponse(res, {
                    message: 'Package not found',
                    statusCode: STATUS_CODES.NOT_FOUND
                });
            }

            const existingPackage = await PackageModel.findById(existingSubscription.packageId).lean();
            if (existingPackage) {
                const comparison = comparePackages(existingPackage, newPackage, sanitizedData.months || 1);
                if (comparison === 'SAME') {
                    const now = new Date();
                    const endDate = new Date(existingSubscription.endDate);
                    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

                    if (daysRemaining > 30) {
                        return errorResponse(res, {
                            message: 'You already have an active subscription for this package. Please wait until closer to expiry date to renew.',
                            fields: {
                                daysRemaining: daysRemaining.toString(),
                                suggestion: 'You can renew this subscription closer to the expiry date'
                            },
                            statusCode: STATUS_CODES.BAD_REQUEST
                        });
                    }
                }
            }
        }

        // Create order in payment gateway
        const orderData = await PaymentService.createOrder({
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
        if (error.message === 'Package not found or not available') {
            return errorResponse(res, {
                message: error.message,
                statusCode: STATUS_CODES.NOT_FOUND
            });
        }
        if (error.message.includes('billing cycle')) {
            return errorResponse(res, {
                message: error.message,
                statusCode: STATUS_CODES.BAD_REQUEST
            });
        }

        // Handle other errors
        return errorResponse(res, parseErrorForResponse(error));
    }
}

module.exports = createOrderController;

