const FeatureService = require("@src/services/feature/feature.service");
const { featureCreationSerializer, featureListSerializer } = require("@src/utils/serializer/feature.serializer");
const Response = require("@src/utils/responseHandler/standardized");
const mongoose = require("mongoose");

// Get features - single by ID or paginated list
async function getFeatureController(req, res) {
    try {
        const queryParams = req.query;

        // If ID is provided, return single feature
        if (queryParams?.id) {
            // Validate MongoDB ObjectId
            if (!mongoose.Types.ObjectId.isValid(queryParams?.id)) {
                return Response.validationError(res, "Invalid feature ID format", {
                    id: "Feature ID must be a valid MongoDB ObjectId"
                });
            }

            const feature = await FeatureService.getById(queryParams?.id);
            const responseData = featureCreationSerializer(feature);

            return Response.success(res, {
                message: "Feature retrieved successfully",
                data: responseData
            });
        }

        // Otherwise, return paginated list
        const paginationOptions = {
            page: queryParams.page,
            limit: queryParams.limit,
            search: queryParams.search,
            category: queryParams.category,
            isActive: queryParams.isActive,
            sortBy: queryParams.sortBy,
            sortOrder: queryParams.sortOrder
        };

        const result = await FeatureService.getPaginated(paginationOptions);
        const serializedFeatures = featureListSerializer(result.features);

        return Response.success(res, {
            message: "Features retrieved successfully",
            data: serializedFeatures,
            meta: {
                pagination: result.pagination
            }
        });

    } catch (error) {
        if (error.message === 'Feature not found') {
            return Response.notFound(res, "Feature not found");
        }

        return Response.handleError(res, error, "getFeatureController");
    }
}

module.exports = getFeatureController;

