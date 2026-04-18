const STATUS_CODES = require("@src/constants/statusCode");

// Success response — { code, message, data }
function successResponse(res, options = {}) {
    const {
        message = "Operation completed successfully",
        data = null,
        statusCode = STATUS_CODES.OK,
        meta = {}
    } = options;

    const response = {
        code: statusCode === STATUS_CODES.CREATED ? "CREATED" : "OK",
        message,
        data,
        ...meta
    };

    return res.status(statusCode).json(response);
}

// Paginated response — adds pagination object to meta
function paginatedResponse(res, message = "Data retrieved successfully", data = [], pagination = {}) {
    return successResponse(res, {
        message,
        data,
        meta: {
            pagination: {
                page: 1,
                totalPages: 1,
                hasNext: false,
                hasPrev: false,
                ...pagination,
                total: pagination.total ?? data.length,
                limit: pagination.limit ?? data.length
            }
        }
    });
}

module.exports = {
    successResponse,
    paginatedResponse
};
