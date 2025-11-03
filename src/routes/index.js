const express = require('express');
const accessMiddleware = require('@src/middlewares/verifyAccessToken.middleware');

const plansRouter = require('./routes/plans.routes');
const subsRouter = require('./routes/subscriptions.routes');
const checkoutRouter = require('./routes/checkout.routes');
const webhookRouter = require('./routes/webhooks.routes');

const router = express.Router();

router.use('/plans', accessMiddleware, plansRouter);
router.use('/subscriptions', accessMiddleware, subsRouter);
router.use('/checkout', accessMiddleware, checkoutRouter);
router.use('/webhooks', webhookRouter); // provider-originated

module.exports = router;