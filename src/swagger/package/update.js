/**
 * @swagger
 * /packages/{id}:
 *   put:
 *     summary: Update a package/plan (Admin only)
 *     description: |
 *       Update an existing subscription package/plan. This endpoint is restricted to admin users only.
 *       
 *       **Authentication:** Requires valid JWT token with admin role (super_admin, admin, or manager)
 *       
 *       **Features:**
 *       - ✅ Update any package field (all fields optional)
 *       - ✅ Validate feature IDs if provided
 *       - ✅ Check for duplicate package names
 *       - ✅ Update only provided fields (partial update)
 *       
 *       **Response Format:** Standardized format with `status`, `message`, `data`, and `error` fields
 *     tags:
 *       - Packages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID (MongoDB ObjectId)
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
 *                 example: "Professional Plan Updated"
 *                 description: Package name (optional, max 200 characters)
 *               description:
 *                 type: string
 *                 example: "Updated description"
 *                 description: Detailed description (optional, max 1000 characters)
 *               shortDescription:
 *                 type: string
 *                 example: "Updated short description"
 *                 description: Short description (optional, max 200 characters)
 *               pricing:
 *                 type: object
 *                 properties:
 *                   amount:
 *                     type: number
 *                     example: 1299
 *                     description: Package price amount (optional, must be >= 0)
 *                   currency:
 *                     type: string
 *                     enum: [INR, USD, EUR]
 *                     example: "INR"
 *                     description: Currency code (optional)
 *                   billingCycle:
 *                     type: string
 *                     enum: [MONTHLY, QUARTERLY, YEARLY, ONE_TIME]
 *                     example: "MONTHLY"
 *                     description: Billing cycle (optional)
 *                   setupFee:
 *                     type: number
 *                     example: 0
 *                     description: One-time setup fee (optional, defaults to 0)
 *                   discount:
 *                     type: number
 *                     example: 15
 *                     description: Discount percentage (optional, 0-100)
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: "64a1b2c3d4e5f6789abcdef0"
 *                 description: Array of feature IDs linked to this package (optional)
 *               planType:
 *                 type: string
 *                 enum: [BASIC, PROFESSIONAL, ENTERPRISE, CUSTOM]
 *                 example: "PROFESSIONAL"
 *                 description: Plan type (optional)
 *               displayOrder:
 *                 type: number
 *                 example: 2
 *                 description: Display order for sorting (optional)
 *               isPopular:
 *                 type: boolean
 *                 example: true
 *                 description: Mark as popular plan (optional)
 *               isRecommended:
 *                 type: boolean
 *                 example: true
 *                 description: Mark as recommended plan (optional)
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, ARCHIVED, DRAFT]
 *                 example: "ACTIVE"
 *                 description: Package status (optional)
 *               isVisible:
 *                 type: boolean
 *                 example: true
 *                 description: Visibility status (optional)
 *               maxSubscribers:
 *                 type: number
 *                 example: 750
 *                 description: Total number of subscriptions that can be sold for this package (null for unlimited)
 *               trialPeriod:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     example: true
 *                     description: Enable trial period (optional)
 *                   days:
 *                     type: number
 *                     example: 30
 *                     description: Trial period in days (optional)
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["popular", "recommended", "updated"]
 *                 description: Tags for categorization (optional)
 *           examples:
 *             update_pricing:
 *               summary: Update pricing only
 *               value:
 *                 pricing:
 *                   amount: 1299
 *                   discount: 15
 *             update_status:
 *               summary: Update status and visibility
 *               value:
 *                 status: "INACTIVE"
 *                 isVisible: false
 *             full_update:
 *               summary: Full update example
 *               value:
 *                 name: "Professional Plan Plus"
 *                 description: "Updated description"
 *                 pricing:
 *                   amount: 1299
 *                   discount: 15
 *                 isPopular: true
 *                 maxSubscribers: 750
 *     responses:
 *       200:
 *         description: Package updated successfully
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
 *                   example: "Package updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "64a1b2c3d4e5f6789abcdef0"
 *                     name:
 *                       type: string
 *                       example: "Professional Plan Updated"
 *                     slug:
 *                       type: string
 *                       example: "professional-plan-updated"
 *                     pricing:
 *                       type: object
 *                       properties:
 *                         amount:
 *                           type: number
 *                         currency:
 *                           type: string
 *                         billingCycle:
 *                           type: string
 *                         setupFee:
 *                           type: number
 *                         discount:
 *                           type: number
 *                         discountedAmount:
 *                           type: number
 *                     features:
 *                       type: array
 *                       items:
 *                         type: object
 *                     planType:
 *                       type: string
 *                     status:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *             examples:
 *               success_response:
 *                 summary: Successful package update
 *                 value:
 *                   status: true
 *                   message: "Package updated successfully"
 *                   data:
 *                     id: "64a1b2c3d4e5f6789abcdef0"
 *                     name: "Professional Plan Updated"
 *                     pricing:
 *                       amount: 1299
 *                       discount: 15
 *                     updatedAt: "2025-01-17T19:00:00.000Z"
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
 *                     validationErrors:
 *                       type: array
 *                       items:
 *                         type: object
 *             examples:
 *               invalid_id:
 *                 summary: Invalid package ID
 *                 value:
 *                   status: false
 *                   message: "Invalid package ID"
 *                   error: "Validation Error"
 *                   data:
 *                     fields:
 *                       id: "Valid package ID is required"
 *               duplicate_name:
 *                 summary: Duplicate package name
 *                 value:
 *                   status: false
 *                   message: "Package name already exists"
 *                   error: "Validation Error"
 *                   data:
 *                     fields:
 *                       name: "A package with this name already exists"
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
 *                   example: "Package not found"
 *                 error:
 *                   type: string
 *                   example: "Not Found"
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

