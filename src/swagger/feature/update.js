/**
 * @swagger
 * /features/{id}:
 *   put:
 *     summary: Update a feature (Admin only)
 *     description: |
 *       Update an existing feature. All fields are optional - only provided fields will be updated.
 *       This endpoint is restricted to admin users only.
 *       
 *       **Authentication:** Requires valid JWT token with admin role (super_admin, admin, or manager)
 *       
 *       **Features:**
 *       - ✅ Update any feature field
 *       - ✅ Partial updates supported
 *       - ✅ Duplicate name validation
 *       
 *       **Response Format:** Standardized format with `status`, `message`, `data`, and `error` fields
 *     tags:
 *       - Features
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature ID
 *         example: "64a1b2c3d4e5f6789abcdef0"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Multi-Store Management Pro"
 *                 description: Feature name (optional, max 200 characters, must be unique)
 *               description:
 *                 type: string
 *                 example: "Advanced multi-store management with analytics"
 *                 description: Detailed description (optional, max 500 characters)
 *               category:
 *                 type: string
 *                 example: "Store Management"
 *                 description: Feature category (optional, max 100 characters)
 *               icon:
 *                 type: string
 *                 example: "store"
 *                 description: Icon name or URL (optional, max 200 characters)
 *               isActive:
 *                 type: boolean
 *                 example: true
 *                 description: Whether the feature is active (optional)
 *           examples:
 *             update_name:
 *               summary: Update name only
 *               value:
 *                 name: "Advanced Inventory Management"
 *             update_status:
 *               summary: Update status only
 *               value:
 *                 isActive: false
 *             full_update:
 *               summary: Full update example
 *               value:
 *                 name: "Advanced Analytics Pro"
 *                 description: "Get detailed insights and reports with AI"
 *                 category: "Analytics"
 *                 icon: "chart-bar"
 *                 isActive: true
 *     responses:
 *       200:
 *         description: Feature updated successfully
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
 *                   example: "Feature updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "64a1b2c3d4e5f6789abcdef0"
 *                     name:
 *                       type: string
 *                       example: "Multi-Store Management Pro"
 *                     description:
 *                       type: string
 *                       example: "Advanced multi-store management with analytics"
 *                     category:
 *                       type: string
 *                       example: "Store Management"
 *                     icon:
 *                       type: string
 *                       example: "store"
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request or validation error
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Feature not found
 *       409:
 *         description: Conflict - Feature name already exists
 *       500:
 *         description: Internal server error
 */

