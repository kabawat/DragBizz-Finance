const FeatureService = require("@src/services/feature/feature.service");
const { validateFeature } = require("@src/utils/validations/feature.validation");
const { sanitizeFeatureData } = require("@src/utils/sanitizer/feature.sanitizer");
const { featureCreationSerializer } = require("@src/utils/serializer/feature.serializer");
const Response = require("@src/utils/responseHandler/standardized");

// Create a new feature (Admin only)
async function createFeatureController(req, res) {
    try {
        const body = req.body;
        const adminId = req.admin?.id;

        // Validate required fields
        const validationResult = validateFeature(body);
        if (!validationResult.isValid) {
            return Response.validationError(res, "Feature validation failed", validationResult.fields);
        }

        // Check for duplicate feature name
        const duplicateName = await FeatureService.nameExists(body.name);
        if (duplicateName) {
            return Response.validationError(res, "Feature name already exists", {
                name: "A feature with this name already exists"
            });
        }

        // Sanitize incoming data
        const sanitizedData = sanitizeFeatureData(body);

        // Create feature
        const featureDoc = await FeatureService.create(sanitizedData, adminId);

        // Serialize response data
        const responseData = featureCreationSerializer(featureDoc);

        return Response.created(res, "Feature created successfully", responseData);

    } catch (error) {
        return Response.handleError(res, error, "createFeatureController");
    }
}

module.exports = createFeatureController;

