/**
 * @swagger
 * /packages/{id}:
 *   delete:
 *     summary: Delete a package/plan (Hard delete - Admin only)
 *     description: |
 *       Permanently delete a subscription package/plan from the database. This is a hard delete operation.
 *       This endpoint is restricted to admin users only.
 *       
 *       **⚠️ Warning:** This operation cannot be undone. The package will be permanently removed from the database.
 *       
 *       **Authentication:** Requires valid JWT token with admin role (super_admin, admin, or manager)
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
 *     responses:
 *       200:
 *         description: Package deleted successfully
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
 *                   example: "Package deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "64a1b2c3d4e5f6789abcdef0"
 *                       description: ID of the deleted package
 *             examples:
 *               success_response:
 *                 summary: Successful package deletion
 *                 value:
 *                   status: true
 *                   message: "Package deleted successfully"
 *                   data:
 *                     id: "64a1b2c3d4e5f6789abcdef0"
 *       400:
 *         description: Validation error - Invalid package ID
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
 *                   example: "Invalid package ID"
 *                 error:
 *                   type: string
 *                   example: "Validation Error"
 *                 data:
 *                   type: object
 *                   properties:
 *                     fields:
 *                       type: object
 *                       example:
 *                         id: "Valid package ID is required"
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
 *                   message: "Invalid package ID"
 *                   error: "Validation Error"
 *                   data:
 *                     fields:
 *                       id: "Valid package ID is required"
 *                     validationErrors:
 *                       - field: "id"
 *                         message: "Valid package ID is required"
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

