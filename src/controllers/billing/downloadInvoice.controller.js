const { getInvoiceDownloadUrl } = require('@src/services/billing/invoice.pdf.service');
const Response = require('@src/utils/responseHandler/standardized');
const STATUS_CODES = require('@src/constants/statusCode');
const logger = require('@src/utils/logger');

// GET /billing/invoices/:invoiceId/download — presigned PDF download URL
async function downloadInvoiceController(req, res) {
    const { invoiceId } = req.params;
    const userId   = req.user?.sub;
    const agencyId = req.user?.agencyId;

    if (!userId) {
        return Response.error(res, { message: 'Unauthorized', statusCode: STATUS_CODES.UNAUTHORIZED });
    }

    try {
        const { url, expiresIn } = await getInvoiceDownloadUrl(invoiceId, userId, agencyId);

        return Response.success(res, {
            message: 'Invoice download URL generated',
            data: {
                downloadUrl: url,
                expiresIn,
                expiresInText: `${Math.round(expiresIn / 60)} minutes`,
            },
        });
    } catch (err) {
        // Structured errors thrown by getInvoiceDownloadUrl
        if (err && err.code) {
            if (err.code === 'NOT_FOUND') {
                return Response.notFound(res, err.message);
            }
            if (err.code === 'FORBIDDEN') {
                return Response.forbidden(res, err.message);
            }
            if (err.code === 'NOT_READY' || err.code === 'FAILED') {
                return Response.error(res, {
                    message: err.message,
                    statusCode: STATUS_CODES.CONFLICT || 409,
                });
            }
        }

        logger.error('[DownloadInvoice] Unexpected error', {
            invoiceId,
            userId,
            error: err.message,
            stack: err.stack,
        });
        return Response.handleError(res, err, 'DownloadInvoice');
    }
}

module.exports = downloadInvoiceController;

