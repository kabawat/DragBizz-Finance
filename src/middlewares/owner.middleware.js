const Response = require('@src/utils/responseHandler/standardized');

const ownerMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== 'store_owner') {
        return Response.forbidden(res, "Access Denied: Only store owners can initiate package payments.");
    }
    next();
};

module.exports = ownerMiddleware;
