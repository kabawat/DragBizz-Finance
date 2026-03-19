const Response = require('@src/utils/responseHandler/standardized');

// Only store_owner can access billing details
const storeOwnerMiddleware = (req, res, next) => {
    const role = req.user?.role;
    if (!role) {
        return Response.validationError(res, 'Unauthorized - User role missing in token.');
    }
    if (role !== 'store_owner') {
        return Response.forbidden(res, 'Access denied - Only store owners can access billing details.');
    }
    next();
};

module.exports = storeOwnerMiddleware;
