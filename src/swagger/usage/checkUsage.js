/**
 * @swagger
 * /usage/check:
 *   post:
 *     summary: Check feature usage
 *     description: Check if user can use a feature based on subscription quota
 *     tags:
 *       - Usage
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - feature
 *             properties:
 *               feature:
 *                 type: string
 *                 description: Feature key to check
 *                 example: "product_management"
 *     responses:
 *       200:
 *         description: Usage check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     canUse:
 *                       type: boolean
 *                       example: true
 *                     remainingQuota:
 *                       type: number
 *                       example: 95
 *                     totalQuota:
 *                       type: number
 *                       example: 100
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /usage/quota:
 *   get:
 *     summary: Get usage quota
 *     description: Get remaining quota for all features
 *     tags:
 *       - Usage
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: feature
 *         schema:
 *           type: string
 *         description: Optional feature key to get quota for specific feature
 *     responses:
 *       200:
 *         description: Quota retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     quotas:
 *                       type: object
 *                       description: Quota for each feature
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /usage/increment:
 *   post:
 *     summary: Increment feature usage
 *     description: Increment usage count for a feature after successful operation
 *     tags:
 *       - Usage
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - feature
 *             properties:
 *               feature:
 *                 type: string
 *                 description: Feature key
 *                 example: "product_management"
 *               amount:
 *                 type: number
 *                 default: 1
 *                 description: Amount to increment (default 1)
 *     responses:
 *       200:
 *         description: Usage incremented successfully
 *       400:
 *         description: Invalid request or quota exceeded
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

