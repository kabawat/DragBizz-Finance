const Response = require('@src/utils/responseHandler/standardized');

const LOG = "[SUB_ACTIVE]";

const ownerMiddleware = (req, res, next) => {
    console.log(`${LOG} [5] ownerMiddleware: start`, { role: req.user?.role, sub: req.user?.sub });
    if (!req.user || req.user.role !== 'store_owner') {
        console.log(`${LOG} [5a] ownerMiddleware: STOP forbidden`);
        return Response.forbidden(res, "Access Denied: Only store owners can purchase or modify subscriptions.");
    }
    console.log(`${LOG} [6] ownerMiddleware: OK, calling getActive`);
    next();
};

module.exports = ownerMiddleware;
