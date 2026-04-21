const PackageService = require("@src/services/package/package.service");
const { packageCreationSerializer, packageListSerializer } = require("@src/utils/serializer/package.serializer");
const { successResponse } = require("@src/utils/responseHandler/success");
const { errorResponse, parseErrorForResponse } = require("@src/utils/responseHandler/error");
const STATUS_CODES = require("@src/constants/statusCode");
const mongoose = require("mongoose");

const { PACKAGE_STATUS } = require('@src/constants/enum/package.enum');

const VALID_STATUSES = PACKAGE_STATUS;
const VALID_PLAN_TYPES = ['BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'];
const VALID_SORT_BY = ['name', 'price', 'createdAt', 'updatedAt', 'displayOrder'];
const VALID_SORT_ORDER = ['asc', 'desc', '1', '-1'];

// Query params validator
function validateQueryParams(queryParams) {
    const errors = {};

    if (queryParams.page !== undefined) {
        const page = parseInt(queryParams.page);
        if (isNaN(page) || page < 1) {
            errors.page = "Page must be a positive integer";
        }
    }

    if (queryParams.limit !== undefined) {
        const limit = parseInt(queryParams.limit);
        if (isNaN(limit) || limit < 1) {
            errors.limit = "Limit must be a positive integer";
        } else if (limit > 100) {
            errors.limit = "Limit cannot exceed 100";
        }
    }
    if (queryParams.planType !== undefined && !VALID_PLAN_TYPES.includes(queryParams.planType)) {
        errors.planType = `Plan type must be one of: ${VALID_PLAN_TYPES.join(', ')}`;
    }

    if (queryParams.search !== undefined) {
        const search = queryParams.search.trim();
        if (search.length > 100) {
            errors.search = "Search query cannot exceed 100 characters";
        }
    }

    if (queryParams.sortBy !== undefined && !VALID_SORT_BY.includes(queryParams.sortBy)) {
        errors.sortBy = `Sort by must be one of: ${VALID_SORT_BY.join(', ')}`;
    }

    if (queryParams.sortOrder !== undefined && !VALID_SORT_ORDER.includes(queryParams.sortOrder)) {
        errors.sortOrder = `Sort order must be one of: ${VALID_SORT_ORDER.join(', ')}`;
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

// Get packages controller
async function getPackageController(req, res) {
    try {
        const queryParams = req.query;

        // Get single package by ID
        if (queryParams?.id) {
            if (!mongoose.Types.ObjectId.isValid(queryParams?.id)) {
                return errorResponse(res, {
                    message: "Invalid package ID format",
                    fields: { id: "Package ID must be a valid MongoDB ObjectId" },
                    statusCode: STATUS_CODES.BAD_REQUEST
                });
            }

            const packageDoc = await PackageService.getById(queryParams?.id);
            const responseData = packageCreationSerializer(packageDoc);

            return successResponse(res, {
                message: "Package fetched successfully",
                data: responseData
            });
        }

        // Validate query params for list
        const validation = validateQueryParams(queryParams);
        if (!validation.isValid) {
            return errorResponse(res, {
                message: "Invalid query parameters",
                fields: validation.errors,
                statusCode: STATUS_CODES.BAD_REQUEST
            });
        }

        // Prepare pagination options
        // isVisible and status are forced for public access — callers cannot override
        const paginationOptions = {
            page: queryParams.page ? parseInt(queryParams.page) : undefined,
            limit: queryParams.limit ? parseInt(queryParams.limit) : undefined,
            status: 'ACTIVE',       // Public route always shows only active packages
            isVisible: true,        // Public route never exposes hidden/draft packages
            planType: queryParams.planType,
            search: queryParams.search?.trim(),
            sortBy: queryParams.sortBy,
            sortOrder: queryParams.sortOrder
        };

        const result = await PackageService.getPaginated(paginationOptions);
        const serializedPackages = packageListSerializer(result.packages);

        // Success response
        return successResponse(res, {
            message: "Packages fetched successfully",
            data: serializedPackages,
            meta: {
                pagination: result.pagination
            }
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

module.exports = getPackageController;

