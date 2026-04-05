/**
 * @swagger
 * /packages:
 *   get:
 *     summary: Get packages - Single package by ID or paginated list (Admin only)
 *     description: |
 *       Fetch packages from the system. This endpoint supports two modes:
 *       
 *       1. **Single Package:** Provide `id` query parameter to fetch a specific package
 *       2. **Paginated List:** Omit `id` parameter to get paginated list of packages
 *       
 *       **Authentication:** Requires valid JWT token with admin role (super_admin, admin, or manager)
 *       
 *       **Features:**
 *       - ✅ Get single package by ID
 *       - ✅ Paginated list with filters
 *       - ✅ Search functionality
 *       - ✅ Sorting options
 *       - ✅ Filter by status, planType, visibility
 *       
 *       **Response Format:** Standardized format with `status`, `message`, `data`, and `meta` fields
 *     tags:
 *       - Packages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: false
 *         schema:
 *           type: string
 *         description: Package ID (MongoDB ObjectId). If provided, returns single package instead of paginated list.
 *         example: "64a1b2c3d4e5f6789abcdef0"
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination (only used when id is not provided)
 *         example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page (only used when id is not provided, max 100)
 *         example: 10
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, ARCHIVED, DRAFT]
 *         description: Filter packages by status (only used when id is not provided)
 *         example: "ACTIVE"
 *       - in: query
 *         name: planType
 *         required: false
 *         schema:
 *           type: string
 *           enum: [BASIC, PROFESSIONAL, ENTERPRISE, CUSTOM]
 *         description: Filter packages by plan type (only used when id is not provided)
 *         example: "PROFESSIONAL"
 *       - in: query
 *         name: isVisible
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filter packages by visibility status (only used when id is not provided)
 *         example: true
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Search in name, description, shortDescription, and tags (only used when id is not provided)
 *         example: "professional"
 *       - in: query
 *         name: sortBy
 *         required: false
 *         schema:
 *           type: string
 *           enum: [displayOrder, createdAt, name, pricing.amount]
 *           default: displayOrder
 *         description: Field to sort by (only used when id is not provided)
 *         example: "displayOrder"
 *       - in: query
 *         name: sortOrder
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order (only used when id is not provided)
 *         example: "asc"
 *     responses:
 *       200:
 *         description: Packages fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Single package response (when id is provided)
 *                   properties:
 *                     status:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "Package fetched successfully"
 *                     data:
 *                       $ref: '#/components/schemas/Package'
 *                 - type: object
 *                   description: Paginated list response (when id is not provided)
 *                   properties:
 *                     status:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "Packages fetched successfully"
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Package'
 *                     meta:
 *                       type: object
 *                       properties:
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             currentPage:
 *                               type: integer
 *                               example: 1
 *                             limit:
 *                               type: integer
 *                               example: 10
 *                             total:
 *                               type: integer
 *                               example: 25
 *                             totalPages:
 *                               type: integer
 *                               example: 3
 *                             hasNextPage:
 *                               type: boolean
 *                               example: true
 *                             hasPrevPage:
 *                               type: boolean
 *                               example: false
 *             examples:
 *               single_package:
 *                 summary: Single package response
 *                 value:
 *                   status: true
 *                   message: "Package fetched successfully"
 *                   data:
 *                     id: "64a1b2c3d4e5f6789abcdef0"
 *                     name: "Professional Plan"
 *                     slug: "professional-plan"
 *                     description: "Best plan for growing businesses"
 *                     shortDescription: "Perfect for professionals"
 *                     pricing:
 *                       amount: 999
 *                       currency: "INR"
 *                       billingCycle: "MONTHLY"
 *                       setupFee: 0
 *                       discount: 10
 *                       discountedAmount: 899.1
 *                       - module: "product"
 *                         report: true
 *                         analytics: false
 *                         usageType: "UNLIMITED"
 *                         usageLimit: null
 *                     planType: "PROFESSIONAL"
 *                     displayOrder: 1
 *                     isPopular: true
 *                     isRecommended: false
 *                     status: "ACTIVE"
 *                     isVisible: true
 *                     tags:
 *                       - "popular"
 *                       - "recommended"
 *                     createdAt: "2025-01-17T18:30:00.000Z"
 *                     updatedAt: "2025-01-17T18:30:00.000Z"
 *               paginated_list:
 *                 summary: Paginated list response
 *                 value:
 *                   status: true
 *                   message: "Packages fetched successfully"
 *                   data:
 *                     - id: "64a1b2c3d4e5f6789abcdef0"
 *                       name: "Basic Plan"
 *                       slug: "basic-plan"
 *                       pricing:
 *                         amount: 499
 *                         currency: "INR"
 *                         billingCycle: "MONTHLY"
 *                       status: "ACTIVE"
 *                     - id: "64a1b2c3d4e5f6789abcdef1"
 *                       name: "Professional Plan"
 *                       slug: "professional-plan"
 *                       pricing:
 *                         amount: 999
 *                         currency: "INR"
 *                         billingCycle: "MONTHLY"
 *                       status: "ACTIVE"
 *                   meta:
 *                     pagination:
 *                       currentPage: 1
 *                       limit: 10
 *                       total: 25
 *                       totalPages: 3
 *                       hasNextPage: true
 *                       hasPrevPage: false
 *       400:
 *         description: Validation error - Invalid package ID format
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
 *                   example: "Invalid package ID format"
 *                 error:
 *                   type: string
 *                   example: "Validation Error"
 *                 data:
 *                   type: object
 *                   properties:
 *                     fields:
 *                       type: object
 *                       example:
 *                         id: "Package ID must be a valid MongoDB ObjectId"
 *                     validationErrors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           field:
 *                             type: string
 *                           message:
 *                             type: string
 *             examples:
 *               invalid_id:
 *                 summary: Invalid package ID format
 *                 value:
 *                   status: false
 *                   message: "Invalid package ID format"
 *                   error: "Validation Error"
 *                   data:
 *                     fields:
 *                       id: "Package ID must be a valid MongoDB ObjectId"
 *                     validationErrors:
 *                       - field: "id"
 *                         message: "Package ID must be a valid MongoDB ObjectId"
 *       401:
 *         description: Unauthorized - Invalid or missing token
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
 *                   example: "Access token missing or invalid."
 *       403:
 *         description: Forbidden - Admin privileges required
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
 *                   example: "Access denied - Admin privileges required."
 *       404:
 *         description: Package not found (when id is provided)
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
 *                   example: "Package not found"
 *                 error:
 *                   type: string
 *                   example: "Not Found"
 *             examples:
 *               not_found:
 *                 summary: Package not found
 *                 value:
 *                   status: false
 *                   message: "Package not found"
 *                   error: "Not Found"
 *       500:
 *         description: Internal server error
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
 *                   example: "An unexpected error occurred"
 *                 error:
 *                   type: string
 *                   example: "Database connection failed"
 *                   description: Error details (only in development)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Package:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "64a1b2c3d4e5f6789abcdef0"
 *           description: Package ID
 *         name:
 *           type: string
 *           example: "Professional Plan"
 *           description: Package name
 *         slug:
 *           type: string
 *           example: "professional-plan"
 *           description: URL-friendly slug
 *         description:
 *           type: string
 *           example: "Best plan for growing businesses"
 *           description: Detailed description
 *         shortDescription:
 *           type: string
 *           example: "Perfect for professionals"
 *           description: Short description
 *         pricing:
 *           type: object
 *           properties:
 *             amount:
 *               type: number
 *               example: 999
 *             currency:
 *               type: string
 *               example: "INR"
 *             billingCycle:
 *               type: string
 *               example: "MONTHLY"
 *             setupFee:
 *               type: number
 *               example: 0
 *             discount:
 *               type: number
 *               example: 10
 *             discountedAmount:
 *               type: number
 *               example: 899.1
 *         features:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               module:
 *                 type: string
 *               report:
 *                 type: boolean
 *               analytics:
 *                 type: boolean
 *               usageType:
 *                 type: string
 *               usageLimit:
 *                 type: number
 *                 nullable: true
 *         planType:
 *           type: string
 *           enum: [BASIC, PROFESSIONAL, ENTERPRISE, CUSTOM]
 *           example: "PROFESSIONAL"
 *         displayOrder:
 *           type: number
 *           example: 1
 *         isPopular:
 *           type: boolean
 *           example: true
 *         isRecommended:
 *           type: boolean
 *           example: false
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, ARCHIVED, DRAFT]
 *           example: "ACTIVE"
 *         isVisible:
 *           type: boolean
 *           example: true
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["popular", "recommended"]
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-01-17T18:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-01-17T18:30:00.000Z"
 */

