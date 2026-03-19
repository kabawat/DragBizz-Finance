const { getInvoices } = require('@src/services/billing/invoice.service');
const Response = require('@src/utils/responseHandler/standardized');

async function getInvoicesController(req, res) {
    try {
        const agencyId = req.user?.agencyId;
        const userId = req.user?.sub;

        if (!agencyId) return Response.validationError(res, 'Agency ID not found in token');
        if (!userId) return Response.validationError(res, 'User ID not found in token');

        const options = { limit: req.query.limit, cursor: req.query.cursor };
        const result = await getInvoices(agencyId, userId, options);

        return Response.success(res, {
            message: 'Invoices fetched successfully',
            data: result.invoices,
            meta: { pagination: result.pagination }
        });
    } catch (error) {
        return Response.handleError(res, error, 'getInvoicesController');
    }
}

module.exports = getInvoicesController;
