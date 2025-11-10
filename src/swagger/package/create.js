/**
 * @swagger
 * /packages:
 *   post:
 *     summary: Create a new package/plan (Admin only)
 *     description: |
 *       Create a new subscription package/plan. This endpoint is restricted to admin users only.
 *       
 *       **Authentication:** Requires valid JWT token with admin role (super_admin, admin, or manager)
 *       
 *       **Features:**
 *       - ✅ Create packages with pricing information
 *       - ✅ Configure features and limits
 *       - ✅ Set trial periods
 *       - ✅ Automatic slug generation from name
 *       - ✅ Feature validation
 *       
 *       **Response Format:** Standardized format with `status`, `message`, `data`, and `error` fields
 *     tags:
 *       - Packages
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
 *               - pricing
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Professional Plan"
 *                 description: Package name (required, max 200 characters)
 *               description:
 *                 type: string
 *                 example: "Best plan for growing businesses"
 *                 description: Detailed description (optional, max 1000 characters)
 *               shortDescription:
 *                 type: string
 *                 example: "Perfect for professionals"
 *                 description: Short description (optional, max 200 characters)
 *               pricing:
 *                 type: object
 *                 required:
 *                   - amount
 *                   - billingCycle
 *                 properties:
 *                   amount:
 *                     type: number
 *                     example: 999
 *                     description: Package price amount (required, must be >= 0)
 *                   currency:
 *                     type: string
 *                     enum: [INR, USD, EUR]
 *                     default: INR
 *                     example: "INR"
 *                     description: Currency code (optional, defaults to INR)
 *                   billingCycle:
 *                     type: string
 *                     enum: [MONTHLY, QUARTERLY, YEARLY, ONE_TIME]
 *                     example: "MONTHLY"
 *                     description: Billing cycle (required)
 *                   setupFee:
 *                     type: number
 *                     example: 0
 *                     default: 0
 *                     description: One-time setup fee (optional, defaults to 0)
 *                   discount:
 *                     type: number
 *                     example: 10
 *                     default: 0
 *                     description: Discount percentage (optional, 0-100, defaults to 0)
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: "64a1b2c3d4e5f6789abcdef0"
 *                 description: Array of feature IDs linked to this package
 *               planType:
 *                 type: string
 *                 enum: [BASIC, PROFESSIONAL, ENTERPRISE, CUSTOM]
 *                 default: BASIC
 *                 example: "PROFESSIONAL"
 *                 description: Plan type (optional)
 *               displayOrder:
 *                 type: number
 *                 example: 1
 *                 default: 0
 *                 description: Display order for sorting (optional)
 *               isPopular:
 *                 type: boolean
 *                 example: false
 *                 default: false
 *                 description: Mark as popular plan (optional)
 *               isRecommended:
 *                 type: boolean
 *                 example: false
 *                 default: false
 *                 description: Mark as recommended plan (optional)
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, ARCHIVED, DRAFT]
 *                 default: ACTIVE
 *                 example: "ACTIVE"
 *                 description: Package status (optional)
 *               isVisible:
 *                 type: boolean
 *                 example: true
 *                 default: true
 *                 description: Visibility status (optional)
 *               maxStores:
 *                 type: number
 *                 example: 5
 *                 default: 1
 *                 description: Maximum number of stores allowed (optional)
 *               maxUsers:
 *                 type: number
 *                 example: 10
 *                 default: 1
 *                 description: Maximum number of users allowed (optional)
 *               maxProducts:
 *                 type: number
 *                 example: 1000
 *                 default: null
 *                 description: Maximum number of products, null means unlimited (optional)
 *               maxStorage:
 *                 type: number
 *                 example: 100
 *                 default: null
 *                 description: Maximum storage in GB, null means unlimited (optional)
 *               trialPeriod:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     example: true
 *                     default: false
 *                     description: Enable trial period (optional)
 *                   days:
 *                     type: number
 *                     example: 14
 *                     default: 0
 *                     description: Trial period in days (required if enabled is true)
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["popular", "recommended"]
 *                 description: Tags for categorization (optional)
 *           examples:
 *             basic_plan:
 *               summary: Basic Plan Example
 *               value:
 *                 name: "Basic Plan"
 *                 shortDescription: "Perfect for small businesses"
 *                 pricing:
 *                   amount: 499
 *                   currency: "INR"
 *                   billingCycle: "MONTHLY"
 *                 planType: "BASIC"
 *                 maxStores: 1
 *                 maxUsers: 2
 *             professional_plan:
 *               summary: Professional Plan Example
 *               value:
 *                 name: "Professional Plan"
 *                 description: "Best plan for growing businesses"
 *                 shortDescription: "Perfect for professionals"
 *                 pricing:
 *                   amount: 999
 *                   currency: "INR"
 *                   billingCycle: "MONTHLY"
 *                   discount: 10
 *                 planType: "PROFESSIONAL"
 *                 isPopular: true
 *                 maxStores: 5
 *                 maxUsers: 10
 *                 maxProducts: 1000
 *                 trialPeriod:
 *                   enabled: true
 *                   days: 14
 *     responses:
 *       201:
 *         description: Package created successfully
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
 *                   example: "Package created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "64a1b2c3d4e5f6789abcdef0"
 *                     name:
 *                       type: string
 *                       example: "Professional Plan"
 *                     slug:
 *                       type: string
 *                       example: "professional-plan"
 *                     description:
 *                       type: string
 *                       example: "Best plan for growing businesses"
 *                     shortDescription:
 *                       type: string
 *                       example: "Perfect for professionals"
 *                     pricing:
 *                       type: object
 *                       properties:
 *                         amount:
 *                           type: number
 *                           example: 999
 *                         currency:
 *                           type: string
 *                           example: "INR"
 *                         billingCycle:
 *                           type: string
 *                           example: "MONTHLY"
 *                         setupFee:
 *                           type: number
 *                           example: 0
 *                         discount:
 *                           type: number
 *                           example: 10
 *                         discountedAmount:
 *                           type: number
 *                           example: 899.1
 *                     features:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           feature:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                               category:
 *                                 type: string
 *                               icon:
 *                                 type: string
 *                           enabled:
 *                             type: boolean
 *                           limit:
 *                             type: number
 *                           unit:
 *                             type: string
 *                     planType:
 *                       type: string
 *                       example: "PROFESSIONAL"
 *                     displayOrder:
 *                       type: number
 *                       example: 1
 *                     isPopular:
 *                       type: boolean
 *                       example: false
 *                     isRecommended:
 *                       type: boolean
 *                       example: false
 *                     status:
 *                       type: string
 *                       example: "ACTIVE"
 *                     isVisible:
 *                       type: boolean
 *                       example: true
 *                     maxStores:
 *                       type: number
 *                       example: 5
 *                     maxUsers:
 *                       type: number
 *                       example: 10
 *                     maxProducts:
 *                       type: number
 *                       example: 1000
 *                     maxStorage:
 *                       type: number
 *                       example: 100
 *                     trialPeriod:
 *                       type: object
 *                       properties:
 *                         enabled:
 *                           type: boolean
 *                         days:
 *                           type: number
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-01-17T18:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-01-17T18:30:00.000Z"
 *             examples:
 *               success_response:
 *                 summary: Successful package creation
 *                 value:
 *                   status: true
 *                   message: "Package created successfully"
 *                   data:
 *                     id: "64a1b2c3d4e5f6789abcdef0"
 *                     name: "Professional Plan"
 *                     slug: "professional-plan"
 *                     pricing:
 *                       amount: 999
 *                       currency: "INR"
 *                       billingCycle: "MONTHLY"
 *                       discount: 10
 *                       discountedAmount: 899.1
 *                     planType: "PROFESSIONAL"
 *                     status: "ACTIVE"
 *                     createdAt: "2025-01-17T18:30:00.000Z"
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
 *                   example: "Package validation failed"
 *                 error:
 *                   type: string
 *                   example: "Validation Error"
 *                 data:
 *                   type: object
 *                   properties:
 *                     fields:
 *                       type: object
 *                       example:
 *                         name: "Package name is required"
 *                         "pricing.amount": "Pricing amount is required and must be a positive number"
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
 *               validation_error:
 *                 summary: Validation error example
 *                 value:
 *                   status: false
 *                   message: "Package validation failed"
 *                   error: "Validation Error"
 *                   data:
 *                     fields:
 *                       name: "Package name is required"
 *                       "pricing.amount": "Pricing amount is required"
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

