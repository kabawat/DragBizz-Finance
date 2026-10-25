const router = require('express').Router();
const {
    getLink,
    createCheckout,
    verifyPayment,
    getStatus,
} = require('@src/controllers/payment/retailPayment.controller');
const {
    paymentRateLimiter,
    paymentCreateRateLimiter,
    paymentVerifyRateLimiter,
} = require('@src/middlewares/rateLimit.payment.middleware');

// Public endpoints for customer outstanding balance payment
router.get('/link/:token', paymentRateLimiter, getLink);
router.post('/checkout', paymentCreateRateLimiter, createCheckout);
router.post('/verify', paymentVerifyRateLimiter, verifyPayment);
router.post('/status', paymentVerifyRateLimiter, getStatus);

module.exports = router;

