const router = require('express').Router();
const {
    getLinkDetailsController,
    createRetailCheckoutController,
    verifyRetailPaymentController,
} = require('@src/controllers/payment/retailPayment.controller');
const {
    paymentRateLimiter,
    paymentCreateRateLimiter,
    paymentVerifyRateLimiter,
} = require('@src/middlewares/rateLimit.payment.middleware');

router.get('/link/:token', paymentRateLimiter, getLinkDetailsController);
router.post('/checkout', paymentCreateRateLimiter, createRetailCheckoutController);
router.post('/verify', paymentVerifyRateLimiter, verifyRetailPaymentController);

module.exports = router;

