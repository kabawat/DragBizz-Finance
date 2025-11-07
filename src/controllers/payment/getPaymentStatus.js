const PaymentService = require('@src/services/payment/payment.service');
const { serializePayment } = require('@src/utils/serializer/payment.serializer');
const Response = require('@src/utils/responseHandler/standardized');

async function getPaymentStatusController(req, res) {
    try {
        const userId = req.user?.sub;
        const { orderId } = req.params;

        if (!orderId) {
            return Response.validationError(res, 'Order ID is required');
        }

        const payment = await PaymentService.getPaymentByOrderId(orderId);

        if (payment.userId !== userId) {
            return Response.forbidden(res, 'You are not authorized to view this payment');
        }

        const responseData = serializePayment(payment);

        return Response.success(res, {
            message: 'Payment details retrieved successfully',
            data: responseData
        });
    } catch (error) {
        if (error.message === 'Payment not found') {
            return Response.notFound(res, error.message);
        }
        return Response.handleError(res, error, 'getPaymentStatusController');
    }
}

module.exports = getPaymentStatusController;

