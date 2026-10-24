const express = require('express');
const accessMiddleware = require('@src/middlewares/verifyAccessToken.middleware');

const webhookRouter = require('./webhooks.routes');
const paymentRouter = require('./payment.routes');
const billingRouter = require('./billing.routes');
const checkoutRouter = require('./checkout.routes');

const router = express.Router();
router.use('/billing', accessMiddleware, billingRouter);
router.use('/subscription', accessMiddleware, paymentRouter);
router.use('/checkout', checkoutRouter);
router.use('/retail', checkoutRouter);
router.use('/webhooks', webhookRouter);

module.exports = router;
