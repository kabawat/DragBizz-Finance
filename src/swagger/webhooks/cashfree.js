/**
 * @swagger
 * /webhooks/cashfree:
 *   post:
 *     summary: Cashfree webhook endpoint
 *     description: |
 *       Receives Cashfree PG payment notifications.
 *       Signature is verified with CASHFREE_CLIENT_SECRET using the raw body and x-webhook-timestamp.
 *       Handled events: PAYMENT_SUCCESS_WEBHOOK, PAYMENT_FAILED_WEBHOOK, PAYMENT_USER_DROPPED_WEBHOOK.
 *       Success events are confirmed with Cashfree Get Order before Finance reports settlement to Core.
 *     tags:
 *       - Webhooks
 *     parameters:
 *       - in: header
 *         name: x-webhook-signature
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-webhook-timestamp
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Webhook accepted
 *       400:
 *         description: Invalid signature or payload
 *       500:
 *         description: Processing failed and Cashfree should retry
 */
