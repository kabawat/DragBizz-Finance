const express = require('express');
const accessMiddleware = require('@src/middlewares/verifyAccessToken.middleware');

const webhookRouter = require('./webhooks.routes');
const paymentRouter = require('./payment.routes');
const billingRouter = require('./billing.routes');
const outstandingRouter = require('./outstanding.routes');

const router = express.Router();
router.use('/billing', accessMiddleware, billingRouter);
router.use('/subscription', accessMiddleware, paymentRouter);
router.use('/outstanding', outstandingRouter);
router.use('/checkout', outstandingRouter); // Backward compatibility
router.use('/webhooks', webhookRouter);

module.exports = router;
