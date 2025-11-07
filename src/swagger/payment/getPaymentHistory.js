/**
 * @swagger
 * /payment/history:
 *   get:
 *     summary: Get payment history
 *     description: |
 *       Get paginated payment history for the authenticated user.
 *       
 *       **Features:**
 *       - Pagination support
 *       - Filter by status
 *       - Filter by date range
 *       - Returns payment details with package information
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, SUCCESS, FAILED, REFUNDED, PARTIALLY_REFUNDED, EXPIRED]
 *         description: Filter by payment status
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter payments from this date (ISO 8601 format)
 *         example: "2025-01-01T00:00:00.000Z"
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter payments until this date (ISO 8601 format)
 *         example: "2025-01-31T23:59:59.999Z"
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
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
 *                   example: "Payment history retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     payments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "64a1b2c3d4e5f6789abcdef0"
 *                           orderId:
 *                             type: string
 *                             example: "order_abc123xyz456"
 *                           razorpayOrderId:
 *                             type: string
 *                             example: "order_MNOPQR123456"
 *                           amount:
 *                             type: number
 *                             example: 999.00
 *                           currency:
 *                             type: string
 *                             example: "INR"
 *                           status:
 *                             type: string
 *                             enum: [PENDING, SUCCESS, FAILED, REFUNDED, PARTIALLY_REFUNDED, EXPIRED]
 *                             example: "SUCCESS"
 *                           paymentMethod:
 *                             type: string
 *                             example: "card"
 *                           package:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           paidAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 25
 *                         totalPages:
 *                           type: integer
 *                           example: 3
 *                         hasNextPage:
 *                           type: boolean
 *                           example: true
 *                         hasPrevPage:
 *                           type: boolean
 *                           example: false
 *             examples:
 *               success_response:
 *                 summary: Payment history with pagination
 *                 value:
 *                   status: true
 *                   message: "Payment history retrieved successfully"
 *                   data:
 *                     payments:
 *                       - id: "64a1b2c3d4e5f6789abcdef0"
 *                         orderId: "order_abc123xyz456"
 *                         razorpayOrderId: "order_MNOPQR123456"
 *                         amount: 999.00
 *                         currency: "INR"
 *                         status: "SUCCESS"
 *                         paymentMethod: "card"
 *                         package:
 *                           id: "64a1b2c3d4e5f6789abcdef0"
 *                           name: "Professional Plan"
 *                         createdAt: "2025-01-17T18:30:00.000Z"
 *                         paidAt: "2025-01-17T18:30:00.000Z"
 *                     pagination:
 *                       currentPage: 1
 *                       limit: 10
 *                       total: 25
 *                       totalPages: 3
 *                       hasNextPage: true
 *                       hasPrevPage: false
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
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Internal server error
 */

