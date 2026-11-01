const {
    getDetails: getCollectLinkDetails,
    createCheckout: createRetailCheckout,
    verifyPayment: verifyRetailPayment,
    getStatus: getPaymentAttemptStatus,
} = require('@src/services/payment/retail/checkout');
const { successResponse } = require('@src/utils/responseHandler/success');
const { errorResponse, parseErrorForResponse } = require('@src/utils/responseHandler/error');
const STATUS_CODES = require('@src/constants/statusCode');

function handlePaymentError(res, error) {
    if (error.statusCode) {
        return errorResponse(res, {
            message: error.message,
            statusCode: error.statusCode || STATUS_CODES.BAD_REQUEST,
            code: error.code,
        });
    }
    return errorResponse(res, parseErrorForResponse(error));
}

// GET /payment/retail/link/:token
async function getLink(req, res) {
    try {
        const { token } = req.params;
        const data = await getCollectLinkDetails(token);
        return successResponse(res, {
            message: 'Payment link details fetched successfully',
            data,
            statusCode: STATUS_CODES.OK,
        });
    } catch (error) {
        return handlePaymentError(res, error);
    }
}

// POST /payment/retail/checkout
async function createCheckout(req, res) {
    try {
        const { token, amount, notes } = req.body || {};
        const data = await createRetailCheckout({ token, amount, notes });
        return successResponse(res, {
            message: 'Payment checkout order created successfully',
            data,
            statusCode: STATUS_CODES.CREATED,
        });
    } catch (error) {
        return handlePaymentError(res, error);
    }
}

// POST /payment/retail/verify
async function verifyPayment(req, res) {
    try {
        const {
            token,
            gatewayOrderId,
            gatewayPaymentId,
            signature,
            amount,
            paymentMethod,
            notes,
        } = req.body || {};

        const data = await verifyRetailPayment({
            token,
            gatewayOrderId,
            gatewayPaymentId,
            signature,
            amount,
            paymentMethod,
            notes,
        });

        return successResponse(res, {
            message: data.message || 'Payment verified successfully',
            data,
            statusCode: STATUS_CODES.OK,
        });
    } catch (error) {
        return handlePaymentError(res, error);
    }
}

// POST /payment/retail/status
async function getStatus(req, res) {
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    try {
        const data = await getPaymentAttemptStatus(req.body || {});
        return successResponse(res, {
            message: 'Payment status fetched successfully',
            data,
            statusCode: STATUS_CODES.OK,
        });
    } catch (error) {
        return errorResponse(res, {
            message: error.statusCode ? error.message : 'Payment status is temporarily unavailable',
            statusCode: error.statusCode || STATUS_CODES.SERVICE_UNAVAILABLE || 503,
        });
    }
}

module.exports = {
    getLink,
    createCheckout,
    verifyPayment,
    getStatus,

    // Backward-compatibility aliases
    getLinkDetails: getLink,
    checkout: createCheckout,
    verify: verifyPayment,
    getLinkDetailsController: getLink,
    createRetailCheckoutController: createCheckout,
    verifyRetailPaymentController: verifyPayment,
    getRetailPaymentStatusController: getStatus,
};
