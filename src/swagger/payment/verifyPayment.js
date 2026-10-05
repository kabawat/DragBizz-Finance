/**
 * @swagger
 * /payment/verify:
 *   post:
 *     summary: Verify payment and activate subscription
 *     description: |
 *       Confirm a payment with the active gateway (`PAYMENT_GATEWAY`). Razorpay clients send `razorpayOrderId`, `razorpayPaymentId`, and `razorpaySignature`. Other gateways send `orderId`. This endpoint:
 *       - Verifies Razorpay payment signature
 *       - Updates payment status
 *       - Creates subscription if payment is successful
 *       - Returns payment and subscription details
 *       
 *       **Security:**
 *       - Signature verification ensures payment authenticity
 *       - Amount validation prevents manipulation
 *       - User authorization check
 *       - Rate limiting (10 requests/minute)
 *       
 *       **Transaction Safety:**
 *       - All operations in MongoDB transaction
 *       - Automatic rollback on errors
 *       - Prevents duplicate processing
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - razorpayOrderId
 *               - razorpayPaymentId
 *               - razorpaySignature
 *             properties:
 *               razorpayOrderId:
 *                 type: string
 *                 example: "order_MNOPQR123456"
 *                 description: Razorpay order ID (required)
 *               razorpayPaymentId:
 *                 type: string
 *                 example: "pay_ABCDEF123456"
 *                 description: Razorpay payment ID (required)
 *               razorpaySignature:
 *                 type: string
 *                 example: "abc123def456ghi789"
 *                 description: Razorpay payment signature (required for Razorpay)
 *               gateway:
 *                 type: string
 *                 description: Ignored for provider selection. The server uses PAYMENT_GATEWAY.
 *               orderId:
 *                 type: string
 *                 example: "order_abc123xyz456"
 *                 description: Merchant order id returned by create-order (required for Cashfree)
 *           examples:
 *             verify_payment:
 *               summary: Verify payment example
 *               value:
 *                 razorpayOrderId: "order_MNOPQR123456"
 *                 razorpayPaymentId: "pay_ABCDEF123456"
 *                 razorpaySignature: "abc123def456ghi789"
 *     responses:
 *       200:
 *         description: Payment verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Payment verified successfully and subscription activated"
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "64a1b2c3d4e5f6789abcdef0"
 *                         orderId:
 *                           type: string
 *                           example: "order_abc123xyz456"
 *                         razorpayOrderId:
 *                           type: string
 *                           example: "order_MNOPQR123456"
 *                         razorpayPaymentId:
 *                           type: string
 *                           example: "pay_ABCDEF123456"
 *                         amount:
 *                           type: number
 *                           example: 999.00
 *                         currency:
 *                           type: string
 *                           example: "INR"
 *                         status:
 *                           type: string
 *                           enum: [PENDING, SUCCESS, FAILED, REFUNDED, PARTIALLY_REFUNDED, EXPIRED]
 *                           example: "SUCCESS"
 *                         paymentMethod:
 *                           type: string
 *                           example: "card"
 *                         paidAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-01-17T18:30:00.000Z"
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-01-17T18:30:00.000Z"
 *                     subscription:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "64a1b2c3d4e5f6789abcdef1"
 *                         status:
 *                           type: string
 *                           enum: [TRIAL, ACTIVE, EXPIRED, CANCELLED, PAUSED]
 *                           example: "ACTIVE"
 *                         startDate:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-01-17T18:30:00.000Z"
 *                         endDate:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-02-17T18:30:00.000Z"
 *                         package:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *             examples:
 *               success_with_subscription:
 *                 summary: Successful payment with subscription
 *                 value:
 *                   status: true
 *                   message: "Payment verified successfully and subscription activated"
 *                   data:
 *                     payment:
 *                       id: "64a1b2c3d4e5f6789abcdef0"
 *                       orderId: "order_abc123xyz456"
 *                       razorpayOrderId: "order_MNOPQR123456"
 *                       razorpayPaymentId: "pay_ABCDEF123456"
 *                       amount: 999.00
 *                       currency: "INR"
 *                       status: "SUCCESS"
 *                       paymentMethod: "card"
 *                       paidAt: "2025-01-17T18:30:00.000Z"
 *                     subscription:
 *                       id: "64a1b2c3d4e5f6789abcdef1"
 *                       status: "ACTIVE"
 *                       startDate: "2025-01-17T18:30:00.000Z"
 *                       endDate: "2025-02-17T18:30:00.000Z"
 *                       package:
 *                         id: "64a1b2c3d4e5f6789abcdef0"
 *                         name: "Professional Plan"
 *               failed_payment:
 *                 summary: Failed payment
 *                 value:
 *                   status: true
 *                   message: "Payment verification completed"
 *                   data:
 *                     payment:
 *                       status: "FAILED"
 *                       failureReason: "Payment failed"
 *                     subscription: null
 *       400:
 *         description: Validation error or invalid signature
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid payment signature"
 *       403:
 *         description: Forbidden - Payment does not belong to user
 *       404:
 *         description: Payment order not found
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       429:
 *         description: Too many requests - Rate limit exceeded
 *       500:
 *         description: Internal server error
 */

