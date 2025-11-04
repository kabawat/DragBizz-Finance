const PackageService = require("@src/services/package/package.service");
const Response = require("@src/utils/responseHandler/standardized");
const mongoose = require("mongoose");

// Delete package (Hard delete - Admin only)
async function deletePackageController(req, res) {
    try {
        const { id } = req.params;
        const adminId = req.admin?.id;

        // Validate package ID
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return Response.validationError(res, "Invalid package ID", { id: "Valid package ID is required" });
        }

        // Delete package using service
        const result = await PackageService.delete(id, adminId);

        return Response.success(res, {
            message: "Package deleted successfully",
            data: result
        });

    } catch (error) {
        if (error.message === 'Package not found') {
            return Response.notFound(res, "Package not found");
        }
        return Response.handleError(res, error, "deletePackageController");
    }
}

module.exports = deletePackageController;

