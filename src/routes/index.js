const express = require('express');
const accessMiddleware = require('@src/middlewares/verifyAccessToken.middleware');
const adminMiddleware = require('@src/middlewares/admin.middleware');

const packageRouter = require('./routes/package.routes');
const subsRouter = require('./routes/subscriptions.routes');
const checkoutRouter = require('./routes/checkout.routes');
const webhookRouter = require('./routes/webhooks.routes');
const paymentRouter = require('./routes/payment.routes');

const router = express.Router();
// admin only routes
router.use('/packages', accessMiddleware, packageRouter);

// user only routes
router.use('/subscriptions', accessMiddleware, subsRouter);
router.use('/checkout', accessMiddleware, checkoutRouter);
router.use('/payment', accessMiddleware, paymentRouter);
router.use('/webhooks', webhookRouter);

module.exports = router;