const router = require('express').Router();
const getInvoicesController = require('@src/controllers/billing/getBillingDetails');
const getHistory = require('@src/controllers/billing/getPurchaseHistory');
const storeOwnerMiddleware = require('@src/middlewares/storeOwner.middleware');

// GET /billing/invoices — payment invoices (store_owner only)
router.get('/invoices', storeOwnerMiddleware, getInvoicesController);

// GET /billing/history — package purchase history (store_owner only)
router.get('/history', storeOwnerMiddleware, getHistory);

module.exports = router;
