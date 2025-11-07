const router = require('express').Router();
const createOrderController = require('@src/controllers/payment/createOrder');
const verifyPaymentController = require('@src/controllers/payment/verifyPayment');
const getPaymentStatusController = require('@src/controllers/payment/getPaymentStatus');
const getPaymentHistoryController = require('@src/controllers/payment/getPaymentHistory');
const paymentSecurityMiddleware = require('@src/middlewares/payment.security.middleware');
const { paymentCreateRateLimiter, paymentVerifyRateLimiter } = require('@src/middlewares/rateLimit.payment.middleware');

router.post('/create-order', paymentCreateRateLimiter, paymentSecurityMiddleware, createOrderController);
router.post('/verify', paymentVerifyRateLimiter, paymentSecurityMiddleware, verifyPaymentController);

// Get payment status by order ID
router.get('/order/:orderId', getPaymentStatusController);

// Get payment history
router.get('/history', getPaymentHistoryController);

module.exports = router;

