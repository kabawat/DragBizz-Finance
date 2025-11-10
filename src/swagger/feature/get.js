/**
 * @swagger
 * /features:
 *   get:
 *     summary: Get features - single by ID or paginated list
 *     description: |
 *       Retrieve a single feature by ID or a paginated list of features with optional search, filtering, and sorting.
 *       
 *       **To get a single feature:** Use `?id=<featureId>` query parameter
 *       
 *       **To get a list:** Use pagination and filter parameters
 *       
 *       **Features:**
 *       - ✅ Get single feature by ID (query parameter)
 *       - ✅ Pagination support
 *       - ✅ Search by name, description, or category
 *       - ✅ Filter by category and isActive status
 *       - ✅ Sort by name, category, createdAt, or isActive
 *       - ✅ Returns only non-deleted features
 *       
 *       **Response Format:** Standardized format with `status`, `message`, `data`, and `pagination` fields
 *       
 *       **Authentication:** Requires valid JWT token with admin role (super_admin, admin, or manager)
 *     tags:
 *       - Features
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: Feature ID to get a single feature (optional)
 *         example: "64a1b2c3d4e5f6789abcdef0"
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
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name, description, or category
 *         example: "inventory"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *         example: "Store Management"
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *         example: true
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, category, createdAt, isActive]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Features retrieved successfully
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
 *                   example: "Features retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "64a1b2c3d4e5f6789abcdef0"
 *                       name:
 *                         type: string
 *                         example: "Multi-Store Management"
 *                       description:
 *                         type: string
 *                         example: "Manage multiple stores from a single dashboard"
 *                       category:
 *                         type: string
 *                         example: "Store Management"
 *                       icon:
 *                         type: string
 *                         example: "store"
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *                     hasNextPage:
 *                       type: boolean
 *                       example: true
 *                     hasPrevPage:
 *                       type: boolean
 *                       example: false
 *       404:
 *         description: Feature not found (when using ?id parameter)
 *       500:
 *         description: Internal server error
 */

