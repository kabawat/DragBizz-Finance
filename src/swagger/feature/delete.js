/**
 * @swagger
 * /features/{id}:
 *   delete:
 *     summary: Delete a feature (Admin only - Soft delete)
 *     description: |
 *       Soft delete a feature by setting the `deletedAt` timestamp. The feature will not be permanently deleted
 *       and can be restored if needed. This endpoint is restricted to admin users only.
 *       
 *       **Authentication:** Requires valid JWT token with admin role (super_admin, admin, or manager)
 *       
 *       **Note:** Soft deleted features will not appear in regular queries but can be accessed if needed.
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
 *         description: Feature ID to delete
 *         example: "64a1b2c3d4e5f6789abcdef0"
 *     responses:
 *       200:
 *         description: Feature deleted successfully
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
 *                   example: "Feature deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "64a1b2c3d4e5f6789abcdef0"
 *       400:
 *         description: Bad request - Invalid feature ID
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Feature not found
 *       500:
 *         description: Internal server error
 */

