/**
 * @swagger
 * /webhooks/razorpay:
 *   post:
 *     summary: Razorpay webhook endpoint
 *     description: |
 *       Webhook endpoint for Razorpay payment notifications.
 *       This endpoint receives payment status updates from Razorpay.
 *       No authentication required (verified by webhook signature).
 *     tags:
 *       - Webhooks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *                 example: "payment.captured"
 *               payload:
 *                 type: object
 *                 description: Payment payload from Razorpay
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook payload
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /webhooks/provider:
 *   post:
 *     summary: Generic payment provider webhook
 *     description: Generic webhook endpoint for payment provider notifications
 *     tags:
 *       - Webhooks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *                 example: "cashfree"
 *               event:
 *                 type: string
 *                 example: "payment.success"
 *               data:
 *                 type: object
 *                 description: Webhook payload
 *     responses:
 *       200:
 *         description: Webhook received
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid webhook payload
 *       500:
 *         description: Internal server error
 */

