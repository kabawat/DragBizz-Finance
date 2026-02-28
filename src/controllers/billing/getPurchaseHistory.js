const { getPurchaseHistory } = require('@src/services/billing/history.service');
const Response = require('@src/utils/responseHandler/standardized');

async function getHistory(req, res) {
    try {
        const agencyId = req.user?.agencyId;
        const userId = req.user?.sub;

        if (!agencyId) return Response.validationError(res, 'Agency ID not found in token');
        if (!userId) return Response.validationError(res, 'User ID not found in token');

        const options = { page: req.query.page, limit: req.query.limit };
        const result = await getPurchaseHistory(agencyId, userId, options);

        return Response.success(res, {
            message: 'Purchase history fetched successfully',
            data: result.history,
            meta: { pagination: result.pagination }
        });
    } catch (error) {
        return Response.handleError(res, error, 'getHistory');
    }
}

module.exports = getHistory;
