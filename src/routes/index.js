const express = require('express');
const accessMiddleware = require('@src/middlewares/verifyAccessToken.middleware');

const packageRouter = require('./routes/package.routes');
const webhookRouter = require('./routes/webhooks.routes');
const paymentRouter = require('./routes/payment.routes');
const billingRouter = require('./routes/billing.routes');
const subscriptionRouter = require('./routes/subscription.routes');

const router = express.Router();
router.use('/packages', packageRouter);
router.use('/payment', accessMiddleware, paymentRouter);
router.use('/billing', accessMiddleware, billingRouter);
router.use('/subscription', accessMiddleware, subscriptionRouter);
router.use('/webhooks', webhookRouter);

module.exports = router;