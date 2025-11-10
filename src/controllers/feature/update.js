const FeatureService = require("@src/services/feature/feature.service");
const { validateFeatureUpdate } = require("@src/utils/validations/feature.validation");
const { sanitizeFeatureData } = require("@src/utils/sanitizer/feature.sanitizer");
const { featureCreationSerializer } = require("@src/utils/serializer/feature.serializer");
const Response = require("@src/utils/responseHandler/standardized");

// Update feature (Admin only)
async function updateFeatureController(req, res) {
    try {
        const featureId = req.params.id;
        const body = req.body;
        const adminId = req.admin?.id;

        if (!featureId) {
            return Response.badRequest(res, "Feature ID is required");
        }

        // Validate update data
        const validationResult = validateFeatureUpdate(body);
        if (!validationResult.isValid) {
            return Response.validationError(res, "Feature validation failed", validationResult.fields);
        }

        // Check for duplicate name if name is being updated
        if (body.name) {
            const duplicateName = await FeatureService.nameExists(body.name, featureId);
            if (duplicateName) {
                return Response.validationError(res, "Feature name already exists", {
                    name: "A feature with this name already exists"
                });
            }
        }

        // Sanitize incoming data
        const sanitizedData = sanitizeFeatureData(body);

        // Update feature
        const featureDoc = await FeatureService.update(featureId, sanitizedData, adminId);

        // Serialize response data
        const responseData = featureCreationSerializer(featureDoc);

        return Response.success(res, "Feature updated successfully", responseData);

    } catch (error) {
        return Response.handleError(res, error, "updateFeatureController");
    }
}

module.exports = updateFeatureController;

