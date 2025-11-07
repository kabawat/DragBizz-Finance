const PaymentService = require('@src/services/payment/payment.service');
const { serializePaymentList } = require('@src/utils/serializer/payment.serializer');
const Response = require('@src/utils/responseHandler/standardized');

async function getPaymentHistoryController(req, res) {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            return Response.validationError(res, 'User ID not found in token');
        }

        const options = {
            page: req.query.page,
            limit: req.query.limit,
            status: req.query.status,
            fromDate: req.query.fromDate,
            toDate: req.query.toDate
        };

        const result = await PaymentService.getUserPayments(userId, options);

        const responseData = {
            payments: serializePaymentList(result.payments),
            pagination: result.pagination
        };

        return Response.success(res, {
            message: 'Payment history retrieved successfully',
            data: responseData.payments,
            meta: {
                pagination: responseData.pagination
            }
        });
    } catch (error) {
        return Response.handleError(res, error, 'getPaymentHistoryController');
    }
}

module.exports = getPaymentHistoryController;

