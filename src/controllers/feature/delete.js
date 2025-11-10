const FeatureService = require("@src/services/feature/feature.service");
const Response = require("@src/utils/responseHandler/standardized");

// Delete feature (Admin only - Soft delete)
async function deleteFeatureController(req, res) {
    try {
        const featureId = req.params.id;
        const adminId = req.admin?.id;

        if (!featureId) {
            return Response.badRequest(res, "Feature ID is required");
        }

        // Delete feature (soft delete)
        const result = await FeatureService.delete(featureId, adminId);

        return Response.success(res, "Feature deleted successfully", result);

    } catch (error) {
        return Response.handleError(res, error, "deleteFeatureController");
    }
}

module.exports = deleteFeatureController;

