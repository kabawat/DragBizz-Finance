const router = require('express').Router();
const createOrderController = require('@src/controllers/payment/createOrder');
const verifyPaymentController = require('@src/controllers/payment/verifyPayment');
const { paymentCreateRateLimiter, paymentVerifyRateLimiter } = require('@src/middlewares/rateLimit.payment.middleware');
const paymentSecurityMiddleware = require('@src/middlewares/payment.security.middleware');
const ownerMiddleware = require('@src/middlewares/owner.middleware');

router.post('/create-order', paymentCreateRateLimiter, paymentSecurityMiddleware, ownerMiddleware, createOrderController);
router.post('/verify', paymentVerifyRateLimiter, paymentSecurityMiddleware, ownerMiddleware, verifyPaymentController);

module.exports = router;
