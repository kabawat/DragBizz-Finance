const Response = require('@src/utils/responseHandler/standardized');

// Middleware to restrict access to store owners only.
const ownerMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== 'store_owner') {
        return Response.forbidden(res, "Access Denied: Only store owners can purchase or modify subscriptions.");
    }
    next();
};

module.exports = ownerMiddleware;
