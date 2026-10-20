const express = require('express');
const accessMiddleware = require('@src/middlewares/verifyAccessToken.middleware');

const webhookRouter = require('./routes/webhooks.routes');
const paymentRouter = require('./routes/payment.routes');
const billingRouter = require('./routes/billing.routes');
const retailPaymentRouter = require('./routes/retailPayment.routes');

const router = express.Router();
router.use('/billing', accessMiddleware, billingRouter);
router.use('/subscription', accessMiddleware, paymentRouter);
router.use('/retail', retailPaymentRouter);
router.use('/webhooks', webhookRouter);

module.exports = router;
