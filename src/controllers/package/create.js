const PackageService = require("@src/services/package/package.service");
const { validatePackage } = require("@src/utils/validations/package.validation");
const { sanitizePackageData } = require("@src/utils/sanitizer/package.sanitizer");
const { packageCreationSerializer } = require("@src/utils/serializer/package.serializer");
const Response = require("@src/utils/responseHandler/standardized");

// Create a new package (Admin only)
async function createPackageController(req, res) {
    try {
        const body = req.body;
        const adminId = req.admin?.id;

        // Validate required fields
        const validationResult = validatePackage(body);
        if (!validationResult.isValid) {
            return Response.validationError(res, "Package validation failed", validationResult.fields);
        }

        // Check for duplicate package name
        const duplicateName = await PackageService.nameExists(body.name);
        if (duplicateName) {
            return Response.validationError(res, "Package name already exists", {
                name: "A package with this name already exists"
            });
        }

        // Sanitize incoming data
        const sanitizedData = sanitizePackageData(body);

        // Create package
        const packageDoc = await PackageService.create(sanitizedData, adminId);

        // Serialize response data
        const responseData = packageCreationSerializer(packageDoc);

        return Response.created(res, "Package created successfully", responseData);

    } catch (error) {
        return Response.handleError(res, error, "createPackageController");
    }
}

module.exports = createPackageController;

