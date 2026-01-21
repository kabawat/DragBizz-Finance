const PackageService = require("@src/services/package/package.service");
const { packageCreationSerializer, packageListSerializer } = require("@src/utils/serializer/package.serializer");
const Response = require("@src/utils/responseHandler/standardized");
const mongoose = require("mongoose");

const { PACKAGE_STATUS } = require('@src/constants/enum/package.enum');

const VALID_STATUSES = PACKAGE_STATUS;
const VALID_PLAN_TYPES = ['BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'];
const VALID_SORT_BY = ['name', 'price', 'createdAt', 'updatedAt', 'displayOrder'];
const VALID_SORT_ORDER = ['asc', 'desc', '1', '-1'];

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

    if (queryParams.status !== undefined && !VALID_STATUSES.includes(queryParams.status)) {
        errors.status = `Status must be one of: ${VALID_STATUSES.join(', ')}`;
    }

    if (queryParams.planType !== undefined && !VALID_PLAN_TYPES.includes(queryParams.planType)) {
        errors.planType = `Plan type must be one of: ${VALID_PLAN_TYPES.join(', ')}`;
    }

    if (queryParams.isVisible !== undefined) {
        const isVisible = queryParams.isVisible.toLowerCase();
        if (isVisible !== 'true' && isVisible !== 'false') {
            errors.isVisible = "isVisible must be 'true' or 'false'";
        }
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

async function getPackageController(req, res) {
    try {
        const queryParams = req.query;

        if (queryParams?.id) {
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

        const validation = validateQueryParams(queryParams);
        if (!validation.isValid) {
            return Response.validationError(res, "Invalid query parameters", validation.errors);
        }

        const paginationOptions = {
            page: queryParams.page ? parseInt(queryParams.page) : undefined,
            limit: queryParams.limit ? parseInt(queryParams.limit) : undefined,
            status: queryParams.status,
            planType: queryParams.planType,
            isVisible: queryParams.isVisible ? queryParams.isVisible.toLowerCase() === 'true' : undefined,
            search: queryParams.search?.trim(),
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

