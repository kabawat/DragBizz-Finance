/**
 * @swagger
 * /payment/create-order:
 *   post:
 *     summary: Create a payment order
 *     description: |
 *       Create a new payment order for purchasing a package. This endpoint creates a Razorpay order and returns the order details.
 *       
 *       **Features:**
 *       - ✅ Creates Razorpay order
 *       - ✅ Validates package availability
 *       - ✅ Calculates pricing with discounts
 *       - ✅ Idempotency support (prevent duplicate orders)
 *       - ✅ Rate limiting (5 requests/minute)
 *       - ✅ Transaction safety (MongoDB transactions)
 *       
 *       **Security:**
 *       - Requires valid JWT token
 *       - Rate limited to prevent abuse
 *       - Idempotency key support via header or body
 *       
 *       **Idempotency:**
 *       - Send `Idempotency-Key` header to prevent duplicate orders
 *       - If duplicate detected, returns existing order
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         schema:
 *           type: string
 *         required: false
 *         description: Unique key to prevent duplicate orders (optional)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - packageId
 *               - billingCycle
 *             properties:
 *               packageId:
 *                 type: string
 *                 example: "64a1b2c3d4e5f6789abcdef0"
 *                 description: Package ID to purchase (required)
 *               billingCycle:
 *                 type: string
 *                 enum: [MONTHLY, QUARTERLY, YEARLY, ONE_TIME]
 *                 example: "MONTHLY"
 *                 description: Billing cycle for the package (required)
 *               couponCode:
 *                 type: string
 *                 example: "SAVE10"
 *                 description: Coupon code for discount (optional)
 *               idempotencyKey:
 *                 type: string
 *                 example: "unique-key-12345"
 *                 description: Idempotency key (optional, can also be sent via header)
 *           examples:
 *             monthly_subscription:
 *               summary: Monthly subscription example
 *               value:
 *                 packageId: "64a1b2c3d4e5f6789abcdef0"
 *                 billingCycle: "MONTHLY"
 *             with_coupon:
 *               summary: With coupon code
 *               value:
 *                 packageId: "64a1b2c3d4e5f6789abcdef0"
 *                 billingCycle: "YEARLY"
 *                 couponCode: "SAVE20"
 *     responses:
 *       201:
 *         description: Payment order created successfully
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
 *                   example: "Payment order created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                       example: "order_abc123xyz456"
 *                       description: Internal order ID
 *                     razorpayOrderId:
 *                       type: string
 *                       example: "order_MNOPQR123456"
 *                       description: Razorpay order ID
 *                     amount:
 *                       type: number
 *                       example: 999.00
 *                       description: Order amount in INR
 *                     currency:
 *                       type: string
 *                       example: "INR"
 *                     keyId:
 *                       type: string
 *                       example: "rzp_test_1234567890"
 *                       description: Razorpay key ID for frontend integration
 *             examples:
 *               success_response:
 *                 summary: Successful order creation
 *                 value:
 *                   status: true
 *                   message: "Payment order created successfully"
 *                   data:
 *                     orderId: "order_abc123xyz456"
 *                     razorpayOrderId: "order_MNOPQR123456"
 *                     amount: 999.00
 *                     currency: "INR"
 *                     keyId: "rzp_test_1234567890"
 *       400:
 *         description: Validation error
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
 *                   example: "Validation failed"
 *                 error:
 *                   type: string
 *                   example: "Validation Error"
 *                 data:
 *                   type: object
 *                   properties:
 *                     fields:
 *                       type: object
 *       404:
 *         description: Package not found
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
 *                   example: "Package not found or not available"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       429:
 *         description: Too many requests - Rate limit exceeded
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
 *                   example: "Too many requests. Please try again later."
 *       500:
 *         description: Internal server error
 */

