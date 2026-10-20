const {
    getCollectLinkDetails,
    createRetailCheckout,
    verifyRetailPayment,
    RetailPaymentError,
} = require('@src/services/payment/retailPayment.service');
const { successResponse } = require('@src/utils/responseHandler/success');
const { errorResponse, parseErrorForResponse } = require('@src/utils/responseHandler/error');
const STATUS_CODES = require('@src/constants/statusCode');

async function getLinkDetailsController(req, res) {
    try {
        const { token } = req.params;
        const data = await getCollectLinkDetails(token);
        return successResponse(res, {
            message: 'Payment link details fetched successfully',
            data,
            statusCode: STATUS_CODES.OK,
        });
    } catch (error) {
        if (error instanceof RetailPaymentError) {
            return errorResponse(res, {
                message: error.message,
                statusCode: error.statusCode || STATUS_CODES.BAD_REQUEST,
                code: error.code,
            });
        }
        return errorResponse(res, parseErrorForResponse(error));
    }
}

async function createRetailCheckoutController(req, res) {
    try {
        const { token, amount, notes } = req.body || {};
        const data = await createRetailCheckout({ token, amount, notes });
        return successResponse(res, {
            message: 'Payment checkout order created successfully',
            data,
            statusCode: STATUS_CODES.CREATED,
        });
    } catch (error) {
        if (error instanceof RetailPaymentError) {
            return errorResponse(res, {
                message: error.message,
                statusCode: error.statusCode || STATUS_CODES.BAD_REQUEST,
                code: error.code,
            });
        }
        return errorResponse(res, parseErrorForResponse(error));
    }
}

async function verifyRetailPaymentController(req, res) {
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
        if (error instanceof RetailPaymentError) {
            return errorResponse(res, {
                message: error.message,
                statusCode: error.statusCode || STATUS_CODES.BAD_REQUEST,
                code: error.code,
            });
        }
        return errorResponse(res, parseErrorForResponse(error));
    }
}

module.exports = {
    getLinkDetailsController,
    createRetailCheckoutController,
    verifyRetailPaymentController,
};

