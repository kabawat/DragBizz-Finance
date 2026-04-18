const { ENVIRONMENT } = require("@config/env.config");
const { getErrorCode } = require("@src/constants/errorCodes");
const STATUS_CODES = require("@src/constants/statusCode");
const mongoose = require("mongoose");

// Builds error JSON payload
function errorPayload(statusCode, message, fields = null, technicalError = null, customCode = null) {
    const code = customCode || getErrorCode(statusCode);
    const isDev = ENVIRONMENT !== "production";

    const payload = { code, message };

    if (technicalError != null)
        payload.error = typeof technicalError === 'string' ? technicalError : message;

    if (fields) payload.fields = fields;

    // Details only in dev, only for non-validation errors
    if (isDev && technicalError && !fields)
        payload.details = typeof technicalError === 'object' ? technicalError : { error: technicalError };

    return payload;
}

// Sends error response
function errorResponse(res, options = {}) {
    const {
        message = "An error occurred",
        error = null,
        fields = null,
        statusCode = STATUS_CODES.INTERNAL_SERVER_ERROR,
        code = null
    } = options;

    return res.status(statusCode).json(errorPayload(statusCode, message, fields, error, code));
}

// Converts raw error → { message, error, fields, statusCode }
function parseErrorForResponse(error) {
    if (!error || typeof error !== 'object') {
        return { message: "An unexpected error occurred", error: "Invalid error object", statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR };
    }

    // Mongoose validation
    if (error instanceof mongoose.Error.ValidationError || error.name === 'ValidationError') {
        const fields = {};
        if (error.errors && typeof error.errors === 'object') {
            Object.keys(error.errors).forEach(f => { fields[f] = error.errors[f].message; });
        }
        return {
            message: "Validation failed",
            error: error.message,
            fields: Object.keys(fields).length > 0 ? fields : null,
            statusCode: STATUS_CODES.BAD_REQUEST
        };
    }

    // Duplicate key (11000 = 409 CONFLICT)
    if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'field';
        return {
            message: "Duplicate entry found",
            error: error.message,
            fields: { [field]: `${field} already exists` },
            statusCode: STATUS_CODES.CONFLICT
        };
    }

    // Invalid ObjectId / cast error
    if (error.name === 'CastError') {
        const field = error.path || 'field';
        return {
            message: "Invalid data format",
            error: error.message,
            fields: { [field]: `Invalid ${field} format` },
            statusCode: STATUS_CODES.BAD_REQUEST
        };
    }

    // MongoDB server errors
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        let message = 'Database error occurred';
        let fields = null;
        if (error.code === 121) { message = 'Document validation failed'; fields = { validation: 'Invalid data format' }; }
        else if (error.message?.includes('connection')) { message = 'Database connection error'; }
        return { message, error: error.message, fields, statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR };
    }

    // Custom thrown error — use error.statusCode if set
    if (error instanceof Error && error.message) {
        return {
            message: String(error.message),
            fields: error.fields || error.details || null,
            statusCode: error.statusCode || STATUS_CODES.BAD_REQUEST
        };
    }

    return { message: "An unexpected error occurred", error: error.message || "Unknown error", statusCode: STATUS_CODES.INTERNAL_SERVER_ERROR };
}

module.exports = { errorPayload, errorResponse, parseErrorForResponse };
