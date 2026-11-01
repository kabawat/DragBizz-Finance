const router = require('express').Router();
const getInvoicesController = require('@src/controllers/billing/getBillingDetails.controller');
const downloadInvoiceController = require('@src/controllers/billing/downloadInvoice.controller');
const storeOwnerMiddleware = require('@src/middlewares/storeOwner.middleware');

// GET /billing/invoices — payment invoices list (store_owner only)
router.get('/invoices', storeOwnerMiddleware, getInvoicesController);

// GET /billing/invoices/:invoiceId/download — presigned PDF download URL (store_owner only)
router.get('/invoices/:invoiceId/download', storeOwnerMiddleware, downloadInvoiceController);

module.exports = router;
