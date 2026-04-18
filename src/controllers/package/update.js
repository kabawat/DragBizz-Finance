const PackageService = require("@src/services/package/package.service");
const { PackageModel } = require("@src/models");
const { validatePackageUpdate } = require("@src/utils/validations/package.validation");
const { sanitizePackageData } = require("@src/utils/sanitizer/package.sanitizer");
const { packageCreationSerializer } = require("@src/utils/serializer/package.serializer");
const { successResponse } = require("@src/utils/responseHandler/success");
const { errorResponse, parseErrorForResponse } = require("@src/utils/responseHandler/error");
const STATUS_CODES = require("@src/constants/statusCode");
const mongoose = require("mongoose");

// Update package (Admin only)
async function updatePackageController(req, res) {
    try {
        const { id } = req.params;
        const body = req.body;
        const adminId = req.admin?.id;

        // Validate package ID
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return errorResponse(res, {
                message: "Invalid package ID",
                fields: { id: "Valid package ID is required" },
                statusCode: STATUS_CODES.BAD_REQUEST
            });
        }

        // Check if package exists
        const existingPackage = await PackageModel.findById(id).lean();
        if (!existingPackage || existingPackage.deletedAt) {
            return errorResponse(res, {
                message: "Package not found",
                statusCode: STATUS_CODES.NOT_FOUND
            });
        }

        // Validate update data
        const validationResult = validatePackageUpdate(body);
        if (!validationResult.isValid) {
            return errorResponse(res, {
                message: "Package validation failed",
                fields: validationResult.fields,
                statusCode: STATUS_CODES.BAD_REQUEST
            });
        }

        // Check for duplicate name
        if (body.name && body.name !== existingPackage.name) {
            const duplicateName = await PackageService.nameExists(body.name, id);
            if (duplicateName) {
                return errorResponse(res, {
                    message: "Package name already exists",
                    fields: { name: "A package with this name already exists" },
                    statusCode: STATUS_CODES.CONFLICT
                });
            }
        }

        // Sanitize update data
        const sanitizedData = sanitizePackageData(body);
        if (!sanitizedData || Object.keys(sanitizedData).length === 0) {
            return errorResponse(res, {
                message: "No valid fields provided for update",
                fields: { body: "At least one field must be provided for update" },
                statusCode: STATUS_CODES.BAD_REQUEST
            });
        }

        // Update package
        const updatedPackage = await PackageService.update(id, sanitizedData, adminId);
        const responseData = packageCreationSerializer(updatedPackage);

        // Success response
        return successResponse(res, {
            message: "Package updated successfully",
            data: responseData
        });

    } catch (error) {
        // Handle other errors
        return errorResponse(res, parseErrorForResponse(error));
    }
}

module.exports = updatePackageController;

