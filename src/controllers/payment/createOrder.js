const PaymentService = require('@src/services/payment');
const SubscriptionService = require('@src/services/subscription/subscription.service');
const { PackageModel } = require('@src/models');
const { validateCreateOrder } = require('@src/utils/validations/payment.validation');
const { sanitizeCreateOrderData } = require('@src/utils/sanitizer/payment.sanitizer');
const { serializeOrderResponse } = require('@src/utils/serializer/payment.serializer');
const { comparePackages } = require('@src/services/subscription/subscription.helpers');
const Response = require('@src/utils/responseHandler/standardized');

async function createOrderController(req, res) {
    try {
        const userId = req.user?.sub;

        if (!userId) {
            return Response.validationError(res, 'User ID not found in token');
        }

        const sanitizedData = sanitizeCreateOrderData(req.body);
        const validation = validateCreateOrder(sanitizedData);
        if (!validation.isValid) {
            return Response.validationError(res, 'Validation failed', validation.errors);
        }

        const existingSubscription = await SubscriptionService.getActiveSubscription(userId);

        if (existingSubscription) {
            const newPackage = await PackageModel.findById(sanitizedData.packageId).lean();
            if (!newPackage) {
                return Response.notFound(res, 'Package not found');
            }

            const existingPackage = await PackageModel.findById(existingSubscription.packageId).lean();
            if (existingPackage) {
                const comparison = comparePackages(existingPackage, newPackage);

                if (comparison === 'SAME') {
                    const now = new Date();
                    const endDate = new Date(existingSubscription.endDate);
                    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

                    if (daysRemaining > 30) {
                        return Response.validationError(res,
                            'You already have an active subscription for this package. Please wait until closer to expiry date to renew.',
                            {
                                daysRemaining: daysRemaining.toString(),
                                suggestion: 'You can renew this subscription closer to the expiry date'
                            }
                        );
                    }
                }
            }
        }

        const orderData = await PaymentService.createOrder({
            userId,
            agencyId: req.user?.agencyId || null,
            ...sanitizedData,
            idempotencyKey: req.idempotencyKey,
            ipAddress: req.clientIp,
            userAgent: req.userAgent
        });

        if (!orderData) {
            return Response.error(res, {
                message: 'Failed to create payment order',
                error: 'Order creation returned no data',
                statusCode: 500
            });
        }

        const responseData = serializeOrderResponse(orderData);
        return Response.created(res, 'Payment order created successfully', responseData);
    } catch (error) {
        if (error.message === 'Package not found or not available') {
            return Response.notFound(res, error.message);
        }
        if (error.message.includes('billing cycle')) {
            return Response.validationError(res, error.message);
        }
        return Response.handleError(res, error, 'createOrderController');
    }
}

module.exports = createOrderController;
