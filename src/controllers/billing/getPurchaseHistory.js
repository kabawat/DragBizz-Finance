const { getPurchaseHistory } = require('@src/services/billing/history.service');
const { successResponse } = require("@src/utils/responseHandler/success");
const { errorResponse, parseErrorForResponse } = require("@src/utils/responseHandler/error");
const STATUS_CODES = require("@src/constants/statusCode");

// Get purchase history controller
async function getHistory(req, res) {
    try {
        const agencyId = req.user?.agencyId;
        const userId = req.user?.sub;

        // Check required IDs
        if (!agencyId || !userId) {
            return errorResponse(res, {
                message: 'Agency or User ID not found in token',
                statusCode: STATUS_CODES.UNAUTHORIZED
            });
        }

        // Fetch purchase history
        const options = { page: req.query.page, limit: req.query.limit };
        const result = await getPurchaseHistory(agencyId, userId, options);

        // Success response
        return successResponse(res, {
            message: 'Purchase history fetched successfully',
            data: result.history,
            meta: { pagination: result.pagination }
        });

    } catch (error) {
        // Handle other errors
        return errorResponse(res, parseErrorForResponse(error));
    }
}

module.exports = getHistory;

