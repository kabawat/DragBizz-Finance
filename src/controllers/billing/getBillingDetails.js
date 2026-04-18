const { getInvoices } = require('@src/services/billing/invoice.service');
const { successResponse } = require("@src/utils/responseHandler/success");
const { errorResponse, parseErrorForResponse } = require("@src/utils/responseHandler/error");
const STATUS_CODES = require("@src/constants/statusCode");

// Get invoices controller
async function getInvoicesController(req, res) {
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

        // Fetch invoices
        const options = { limit: req.query.limit, cursor: req.query.cursor };
        const result = await getInvoices(agencyId, userId, options);

        // Success response
        return successResponse(res, {
            message: 'Invoices fetched successfully',
            data: result.invoices,
            meta: { pagination: result.pagination }
        });

    } catch (error) {
        // Handle other errors
        return errorResponse(res, parseErrorForResponse(error));
    }
}

module.exports = getInvoicesController;

