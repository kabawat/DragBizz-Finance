const PackageService = require("@src/services/package/package.service");
const { validatePackage } = require("@src/utils/validations/package.validation");
const { sanitizePackageData } = require("@src/utils/sanitizer/package.sanitizer");
const { packageCreationSerializer } = require("@src/utils/serializer/package.serializer");
const { successResponse } = require("@src/utils/responseHandler/success");
const { errorResponse, parseErrorForResponse } = require("@src/utils/responseHandler/error");
const STATUS_CODES = require("@src/constants/statusCode");

// Create a new package (Admin only)
async function createPackageController(req, res) {
    try {
        const body = req.body;
        const adminId = req.admin?.id;

        // Validate package data
        const validationResult = validatePackage(body);
        if (!validationResult.isValid) {
            return errorResponse(res, {
                message: "Package validation failed",
                fields: validationResult.fields,
                statusCode: STATUS_CODES.BAD_REQUEST
            });
        }

        // Check for duplicate name
        const duplicateName = await PackageService.nameExists(body.name);
        if (duplicateName) {
            return errorResponse(res, {
                message: "Package name already exists",
                fields: { name: "A package with this name already exists" },
                statusCode: STATUS_CODES.CONFLICT
            });
        }

        // Create package
        const sanitizedData = sanitizePackageData(body);
        const packageDoc = await PackageService.create(sanitizedData, adminId);
        const responseData = packageCreationSerializer(packageDoc);

        // Success response
        return successResponse(res, {
            message: "Package created successfully",
            data: responseData,
            statusCode: STATUS_CODES.CREATED
        });

    } catch (error) {
        // Handle other errors
        return errorResponse(res, parseErrorForResponse(error));
    }
}

module.exports = createPackageController;