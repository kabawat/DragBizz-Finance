const router = require('express').Router();
const createOrderController = require('@src/controllers/payment/createOrder');
const verifyPaymentController = require('@src/controllers/payment/verifyPayment');
const { paymentCreateRateLimiter, paymentVerifyRateLimiter } = require('@src/middlewares/rateLimit.payment.middleware');
const paymentSecurityMiddleware = require('@src/middlewares/payment.security.middleware');

router.post('/create-order', paymentCreateRateLimiter, paymentSecurityMiddleware, createOrderController);
router.post('/verify', paymentVerifyRateLimiter, paymentSecurityMiddleware, verifyPaymentController);

module.exports = router;
