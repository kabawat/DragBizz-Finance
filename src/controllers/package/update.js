const PackageService = require("@src/services/package/package.service");
const { PackageModel } = require("@src/models");
const { validatePackageUpdate } = require("@src/utils/validations/package.validation");
const { sanitizePackageData } = require("@src/utils/sanitizer/package.sanitizer");
const { packageCreationSerializer } = require("@src/utils/serializer/package.serializer");
const Response = require("@src/utils/responseHandler/standardized");
const mongoose = require("mongoose");

// Update package (Admin only)
async function updatePackageController(req, res) {
    try {
        const { id } = req.params;
        const body = req.body;
        const adminId = req.admin?.id;

        // Validate package ID
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return Response.validationError(res, "Invalid package ID", { id: "Valid package ID is required" });
        }

        // Check if package exists
        const existingPackage = await PackageModel.findById(id).lean();
        if (!existingPackage || existingPackage.deletedAt) {
            return Response.notFound(res, "Package not found");
        }

        // Validate update data
        const validationResult = validatePackageUpdate(body);
        if (!validationResult.isValid) {
            return Response.validationError(res, "Package validation failed", validationResult.fields);
        }

        // Check for duplicate package name if name is being updated
        if (body.name && body.name !== existingPackage.name) {
            const duplicateName = await PackageService.nameExists(body.name, id);
            if (duplicateName) {
                return Response.validationError(res, "Package name already exists", {
                    name: "A package with this name already exists"
                });
            }
        }

        // Sanitize incoming data
        const sanitizedData = sanitizePackageData(body);

        // Check if there's any data to update
        if (!sanitizedData || Object.keys(sanitizedData).length === 0) {
            return Response.validationError(res, "No valid fields provided for update", {
                body: "At least one field must be provided for update"
            });
        }

        // Update package
        const updatedPackage = await PackageService.update(id, sanitizedData, adminId);

        // Serialize response data
        const responseData = packageCreationSerializer(updatedPackage);

        return Response.success(res, {
            message: "Package updated successfully",
            data: responseData
        });

    } catch (error) {
        return Response.handleError(res, error, "updatePackageController");
    }
}

module.exports = updatePackageController;
