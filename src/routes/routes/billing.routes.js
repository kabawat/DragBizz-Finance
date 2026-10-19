const router = require('express').Router();
const getInvoicesController = require('@src/controllers/billing/getBillingDetails');
const storeOwnerMiddleware = require('@src/middlewares/storeOwner.middleware');

// GET /billing/invoices — payment invoices (store_owner only)
router.get('/invoices', storeOwnerMiddleware, getInvoicesController);

module.exports = router;
