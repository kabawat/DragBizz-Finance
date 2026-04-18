const PackageService = require("@src/services/package/package.service");
const { successResponse } = require("@src/utils/responseHandler/success");
const { errorResponse, parseErrorForResponse } = require("@src/utils/responseHandler/error");
const STATUS_CODES = require("@src/constants/statusCode");
const mongoose = require("mongoose");

// Delete package (Hard delete - Admin only)
async function deletePackageController(req, res) {
    try {
        const { id } = req.params;
        const adminId = req.admin?.id;

        // Validate package ID
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return errorResponse(res, {
                message: "Invalid package ID",
                fields: { id: "Valid package ID is required" },
                statusCode: STATUS_CODES.BAD_REQUEST
            });
        }

        // Delete package using service
        const result = await PackageService.delete(id, adminId);

        return successResponse(res, {
            message: "Package deleted successfully",
            data: result
        });

    } catch (error) {
        // Handle specific "not found" case
        if (error.message === 'Package not found') {
            return errorResponse(res, {
                message: "Package not found",
                statusCode: STATUS_CODES.NOT_FOUND
            });
        }

        // Handle other errors
        return errorResponse(res, parseErrorForResponse(error));
    }
}

module.exports = deletePackageController;


