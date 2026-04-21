const Response = require("@src/utils/responseHandler/standardized");

const ADMIN_ROLES = ["super_admin", "admin", "manager"];

// Verify admin role
const adminMiddleware = async (req, res, next) => {
    try {
        const user = req.user;

        if (!user || !user.role) {
            return Response.validationError(res, "Unauthorized - User role missing in token.");
        }

        // Verify admin role
        if (!ADMIN_ROLES.includes(user.role)) {
            return Response.forbidden(res, "Access denied - Admin privileges required.");
        }

        // Attach admin info to request
        req.admin = {
            id: user.sub,
            role: user.role,
        };

        next();
    } catch (err) {
        return Response.handleError(res, err, "adminMiddleware");
    }
};

module.exports = adminMiddleware;

