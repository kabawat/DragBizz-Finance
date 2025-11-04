const PackageService = require("@src/services/package/package.service");
const { packageCreationSerializer, packageListSerializer } = require("@src/utils/serializer/package.serializer");
const Response = require("@src/utils/responseHandler/standardized");
const mongoose = require("mongoose");

// Get packages - single by ID or paginated list
async function getPackageController(req, res) {
    try {
        const queryParams = req.query;

        // If ID is provided, return single package
        if (queryParams?.id) {
            // Validate MongoDB ObjectId
            if (!mongoose.Types.ObjectId.isValid(queryParams?.id)) {
                return Response.validationError(res, "Invalid package ID format", {
                    id: "Package ID must be a valid MongoDB ObjectId"
                });
            }

            const packageDoc = await PackageService.getById(queryParams?.id);
            const responseData = packageCreationSerializer(packageDoc);

            return Response.success(res, {
                message: "Package fetched successfully",
                data: responseData
            });
        }

        // Otherwise, return paginated list
        const paginationOptions = {
            page: queryParams.page,
            limit: queryParams.limit,
            status: queryParams.status,
            planType: queryParams.planType,
            isVisible: queryParams.isVisible,
            search: queryParams.search,
            sortBy: queryParams.sortBy,
            sortOrder: queryParams.sortOrder
        };

        const result = await PackageService.getPaginated(paginationOptions);
        const serializedPackages = packageListSerializer(result.packages);

        return Response.success(res, {
            message: "Packages fetched successfully",
            data: serializedPackages,
            meta: {
                pagination: result.pagination
            }
        });

    } catch (error) {
        if (error.message === 'Package not found') {
            return Response.notFound(res, "Package not found");
        }

        return Response.handleError(res, error, "getPackageController");
    }
}

module.exports = getPackageController;

