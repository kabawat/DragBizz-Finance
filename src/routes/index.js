const express = require('express');
const accessMiddleware = require('@src/middlewares/verifyAccessToken.middleware');

const webhookRouter = require('./routes/webhooks.routes');
const paymentRouter = require('./routes/payment.routes');
const billingRouter = require('./routes/billing.routes');

const router = express.Router();
router.use('/payment', accessMiddleware, paymentRouter);
router.use('/billing', accessMiddleware, billingRouter);
router.use('/webhooks', webhookRouter);

module.exports = router;
