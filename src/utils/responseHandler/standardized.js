const STATUS_CODES = require("@src/constants/statusCode");
const { ENVIRONMENT } = require("@config/env.config");

class Response {
    // Success Response Handler
    static success(res, options = {}) {
        const {
            message = "Operation completed successfully",
            data = null,
            statusCode = STATUS_CODES.OK || 200,
            meta = {}
        } = options;

        const response = {
            status: true,
            message,
            data,
            ...meta
        };

        return res.status(statusCode).json(response);
    }

    // Error Response Handler
    static error(res, options = {}) {
        // Handle case where options might be an Error object
        let errorMessage = "Unknown error";
        let errorName = "Unknown error";
        let statusCode = STATUS_CODES.INTERNAL_SERVER_ERROR || 500;
        let data = null;
        let meta = {};
        let message = "An error occurred";

        if (options && typeof options === 'object') {
            if (options instanceof Error) {
                errorMessage = options.message || "Unknown error";
                errorName = options.name || "Error";
                message = options.message || "An error occurred";
            } else {
                message = options.message || message;
                errorMessage = options.error || errorName;
                statusCode = options.statusCode || statusCode;
                data = options.data || data;
                meta = options.meta || meta;
            }
        } else if (typeof options === 'string') {
            message = options;
            errorMessage = options;
        }

        const response = {
            status: false,
            message,
            error: ENVIRONMENT === "development" ? errorMessage : undefined,
            data,
            ...meta
        };

        return res.status(statusCode).json(response);
    }

    // Field-specific Validation Error Response Handler
    static validationError(res, message = "Validation failed", fields = {}, statusCode = STATUS_CODES.BAD_REQUEST || 400) {
        // Handle both array of errors and object fields
        let validationErrors = [];
        let fieldsData = {};
        
        if (Array.isArray(fields)) {
            validationErrors = fields.map(error => ({
                field: 'general',
                message: error
            }));
            fieldsData = { validation: fields };
        } else {
            validationErrors = Object.keys(fields).map(field => ({
                field: field,
                message: fields[field]
            }));
            fieldsData = fields;
        }
        
        return this.error(res, {
            message,
            error: "Validation Error",
            statusCode,
            data: {
                fields: fieldsData,
                validationErrors: validationErrors
            }
        });
    }

    // Not Found Error Response Handler
    static notFound(res, message = "Resource not found", error = "Not Found") {
        return this.error(res, {
            message,
            error,
            statusCode: STATUS_CODES.NOT_FOUND || 404
        });
    }

    // Created Success Response Handler
    static created(res, message = "Resource created successfully", data = null) {
        return this.success(res, {
            message,
            data,
            statusCode: STATUS_CODES.CREATED || 201
        });
    }

    // Forbidden Error Response Handler
    static forbidden(res, message = "Access denied", error = "Forbidden") {
        return this.error(res, {
            message,
            error,
            statusCode: STATUS_CODES.FORBIDDEN || 403
        });
    }

    static handleError(res, error, context = "Unknown") {
        const logger = require("@src/utils/logger");
        logger.error(`${context} Error:`, { error: error.message, stack: error.stack, context });
        
        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const fields = {};
            Object.keys(error.errors).forEach(field => {
                fields[field] = error.errors[field].message;
            });
            
            return this.validationError(res, "Validation failed", fields);
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            const duplicateField = Object.keys(error.keyPattern)[0];
            return this.validationError(res, "Duplicate entry found", {
                [duplicateField]: `${duplicateField} already exists`
            });
        }

        // Handle cast errors
        if (error.name === 'CastError') {
            return this.validationError(res, "Invalid data format", {
                [error.path]: `Invalid ${error.path} format`
            });
        }

        // Default error response
        return this.error(res, {
            message: "An unexpected error occurred",
            error: ENVIRONMENT === "production" ? "Internal server error" : error.message,
            statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR || 500
        });
    }
}

module.exports = Response;