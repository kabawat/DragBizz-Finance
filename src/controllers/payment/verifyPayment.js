const PaymentService = require('@src/services/payment');
const { validateVerifyPayment } = require('@src/utils/validations/payment.validation');
const { sanitizeVerifyPaymentData } = require('@src/utils/sanitizer/payment.sanitizer');
const { serializePayment } = require('@src/utils/serializer/payment.serializer');
const { successResponse } = require("@src/utils/responseHandler/success");
const { errorResponse, parseErrorForResponse } = require("@src/utils/responseHandler/error");
const STATUS_CODES = require("@src/constants/statusCode");
const logger = require('@src/utils/logger');

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
        const payment = await PaymentService.verifyPayment({
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

        let subscription = null;
        let subscriptionType = null;
        let retries = 0;

        // Wait for webhook (max 2s) to get UI display data
        if (payment.status === 'SUCCESS') {
            const { SubscriptionModel } = require('@src/models');
            const SubscriptionService = require('@src/services/subscription');

            while (retries < 4) {
                subscription = await SubscriptionModel.findOne({ paymentId: payment._id })
                    .populate('packageId', 'name')
                    .lean();

                if (subscription) break;
                await new Promise(res => setTimeout(res, 500));
                retries++;
            }

            if (subscription) {
                const existingSubscription = await SubscriptionService.getActiveSubscription(userId);

                if (subscription.status === 'PENDING') {
                    subscriptionType = 'DOWNGRADE';
                } else if (existingSubscription && existingSubscription._id.toString() !== subscription._id.toString()) {
                    const existingPackageId = existingSubscription.packageId?._id?.toString() || existingSubscription.packageId?.toString();
                    const newPackageId = subscription.packageId?._id?.toString() || subscription.packageId?.toString();

                    if (existingPackageId === newPackageId) {
                        subscriptionType = 'RENEWAL';
                    } else {
                        subscriptionType = 'UPGRADE';
                    }
                } else {
                    subscriptionType = 'NEW';
                }
            }
        }

        // Success response
        const proratedCredit = payment.metadata?.proratedCredit || 0;
        const responseData = {
            payment: serializePayment(payment),
            subscription: subscription ? {
                id: subscription._id,
                status: subscription.status,
                startDate: subscription.startDate,
                endDate: subscription.endDate,
                package: subscription.packageId ? {
                    id: subscription.packageId._id,
                    name: subscription.packageId.name
                } : null,
                type: subscriptionType,
                proratedCredit: proratedCredit > 0 ? proratedCredit : null
            } : null
        };

        return successResponse(res, {
            message: payment.status === 'SUCCESS'
                ? 'Payment verified successfully.'
                : 'Payment verification completed',
            data: responseData
        });

    } catch (error) {
        // Handle specific error cases
        if (error.message === 'Invalid payment signature') {
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
