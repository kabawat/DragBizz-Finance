/**
 * @swagger
 * /features:
 *   post:
 *     summary: Create a new feature (Admin only)
 *     description: |
 *       Create a new feature that can be associated with packages. This endpoint is restricted to admin users only.
 *       
 *       **Authentication:** Requires valid JWT token with admin role (super_admin, admin, or manager)
 *       
 *       **Features:**
 *       - ✅ Create features with name, description, category, and icon
 *       - ✅ Set active/inactive status
 *       - ✅ Automatic validation and sanitization
 *       
 *       **Response Format:** Standardized format with `status`, `message`, `data`, and `error` fields
 *     tags:
 *       - Features
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Multi-Store Management"
 *                 description: Feature name (required, max 200 characters, must be unique)
 *               description:
 *                 type: string
 *                 example: "Manage multiple stores from a single dashboard"
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
 *                 default: true
 *                 description: Whether the feature is active (optional, defaults to true)
 *           examples:
 *             basic_feature:
 *               summary: Basic Feature Example
 *               value:
 *                 name: "Inventory Management"
 *                 description: "Track and manage your inventory"
 *                 category: "Inventory"
 *                 isActive: true
 *             full_feature:
 *               summary: Full Feature Example
 *               value:
 *                 name: "Advanced Analytics"
 *                 description: "Get detailed insights and reports"
 *                 category: "Analytics"
 *                 icon: "chart-bar"
 *                 isActive: true
 *     responses:
 *       201:
 *         description: Feature created successfully
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
 *                   example: "Feature created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "64a1b2c3d4e5f6789abcdef0"
 *                     name:
 *                       type: string
 *                       example: "Multi-Store Management"
 *                     description:
 *                       type: string
 *                       example: "Manage multiple stores from a single dashboard"
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
 *                   example: "Feature validation failed"
 *                 error:
 *                   type: string
 *                   example: "Validation Error"
 *                 data:
 *                   type: object
 *                   properties:
 *                     fields:
 *                       type: object
 *                       example:
 *                         name: "Feature name is required"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin access required
 *       409:
 *         description: Conflict - Feature name already exists
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
 *                   example: "Feature name already exists"
 *                 error:
 *                   type: string
 *                   example: "Validation Error"
 *                 data:
 *                   type: object
 *                   properties:
 *                     fields:
 *                       type: object
 *                       example:
 *                         name: "A feature with this name already exists"
 *       500:
 *         description: Internal server error
 */

