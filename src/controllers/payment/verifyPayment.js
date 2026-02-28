const PaymentService = require('@src/services/payment');
const { validateVerifyPayment } = require('@src/utils/validations/payment.validation');
const { sanitizeVerifyPaymentData } = require('@src/utils/sanitizer/payment.sanitizer');
const { serializePayment } = require('@src/utils/serializer/payment.serializer');
const Response = require('@src/utils/responseHandler/standardized');
const logger = require('@src/utils/logger');

async function verifyPaymentController(req, res) {
    try {
        const userId = req.user?.sub;

        if (!userId) {
            return Response.validationError(res, 'User ID not found in token');
        }

        const sanitizedData = sanitizeVerifyPaymentData(req.body);
        const validation = validateVerifyPayment(sanitizedData);
        if (!validation.isValid) {
            return Response.validationError(res, 'Validation failed', validation.errors);
        }

        const payment = await PaymentService.verifyPayment({
            ...sanitizedData,
            ipAddress: req.clientIp,
            userAgent: req.userAgent
        });

        if (payment.userId !== userId) {
            return Response.forbidden(res, 'You are not authorized to verify this payment');
        }

        let subscription = null;
        let subscriptionType = null;
        let retries = 0;

        // Wait for webhook (max 2s) to get UI display data
        if (payment.status === 'SUCCESS') {
            const { SubscriptionModel } = require('@src/models');
            const SubscriptionService = require('@src/services/subscription/subscription.service');

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

        return Response.success(res, {
            message: payment.status === 'SUCCESS'
                ? 'Payment verified successfully.'
                : 'Payment verification completed',
            data: responseData
        });
    } catch (error) {
        if (error.message === 'Invalid payment signature') {
            return Response.validationError(res, error.message);
        }
        if (error.message.includes('not found')) {
            return Response.notFound(res, error.message);
        }
        return Response.handleError(res, error, 'verifyPaymentController');
    }
}

module.exports = verifyPaymentController;

