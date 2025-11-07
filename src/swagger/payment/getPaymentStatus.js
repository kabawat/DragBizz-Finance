/**
 * @swagger
 * /payment/order/{orderId}:
 *   get:
 *     summary: Get payment status by order ID
 *     description: |
 *       Get payment details and status by internal order ID.
 *       
 *       **Returns:**
 *       - Payment details
 *       - Package information
 *       - Payment status
 *       - Transaction history
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         example: "order_abc123xyz456"
 *         description: Internal order ID
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
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
 *                   example: "Payment details retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "64a1b2c3d4e5f6789abcdef0"
 *                     orderId:
 *                       type: string
 *                       example: "order_abc123xyz456"
 *                     razorpayOrderId:
 *                       type: string
 *                       example: "order_MNOPQR123456"
 *                     razorpayPaymentId:
 *                       type: string
 *                       example: "pay_ABCDEF123456"
 *                       nullable: true
 *                     amount:
 *                       type: number
 *                       example: 999.00
 *                     currency:
 *                       type: string
 *                       example: "INR"
 *                     status:
 *                       type: string
 *                       enum: [PENDING, SUCCESS, FAILED, REFUNDED, PARTIALLY_REFUNDED, EXPIRED]
 *                       example: "SUCCESS"
 *                     paymentMethod:
 *                       type: string
 *                       example: "card"
 *                       nullable: true
 *                     package:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         description:
 *                           type: string
 *                         pricing:
 *                           type: object
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     paidAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *             examples:
 *               pending_payment:
 *                 summary: Pending payment
 *                 value:
 *                   status: true
 *                   message: "Payment details retrieved successfully"
 *                   data:
 *                     orderId: "order_abc123xyz456"
 *                     razorpayOrderId: "order_MNOPQR123456"
 *                     status: "PENDING"
 *                     amount: 999.00
 *                     currency: "INR"
 *               successful_payment:
 *                 summary: Successful payment
 *                 value:
 *                   status: true
 *                   message: "Payment details retrieved successfully"
 *                   data:
 *                     orderId: "order_abc123xyz456"
 *                     razorpayOrderId: "order_MNOPQR123456"
 *                     razorpayPaymentId: "pay_ABCDEF123456"
 *                     status: "SUCCESS"
 *                     amount: 999.00
 *                     paymentMethod: "card"
 *                     paidAt: "2025-01-17T18:30:00.000Z"
 *       404:
 *         description: Payment not found
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
 *                   example: "Payment not found"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Internal server error
 */

