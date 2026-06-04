const { getActiveSubscription } = require('@src/services/subscription/get.service');
const { resolveAgencyId } = require('@src/services/subscription/resolveAgencyId.service');
const { successResponse } = require("@src/utils/responseHandler/success");
const { errorResponse, parseErrorForResponse } = require("@src/utils/responseHandler/error");
const STATUS_CODES = require("@src/constants/statusCode");

// Get active subscription controller
async function getActive(req, res) {
    try {
        const userId = req.user?.sub;
        const tenant = req.user?.tenant; // JWT only, not cookies

        if (!userId) {
            return errorResponse(res, {
                message: 'User ID not found in token',
                statusCode: STATUS_CODES.UNAUTHORIZED
            });
        }

        const agencyId = await resolveAgencyId({
            userId,
            agencyId: req.user?.agencyId,
            tenant,
        });

        const populatePackage = req.query.populatePackage !== 'false';

        const subscription = await getActiveSubscription(userId, {
            agencyId,
            populatePackage,
        });

        // Handle not found
        if (!subscription) {
            return errorResponse(res, {
                message: 'No active subscription found',
                statusCode: STATUS_CODES.NOT_FOUND
            });
        }

        // Transform features data
        const detailedFeatures = (subscription.features || []).map(f => ({
            module: f.module,
            currentUsage: f.currentUsage || 0,
            maxLimit: f.maxLimit,
            usageType: f.usageType
        }));

        // Clean up subscription object
        const { agencyId: _, ...cleanSubscription } = subscription;
        const responseData = {
            ...cleanSubscription,
            features: detailedFeatures
        };

        // Success response
        return successResponse(res, {
            message: 'Active subscription details fetched successfully',
            data: responseData
        });

    } catch (error) {
        // Handle other errors
        return errorResponse(res, parseErrorForResponse(error));
    }
}

module.exports = getActive;
