const { getActiveSubscription } = require('@src/services/subscription/get.service');
const { SubscriptionModel } = require('@src/models');
const { getActiveSubscriptionQuery } = require('@src/services/subscription/helpers');
const { successResponse } = require("@src/utils/responseHandler/success");
const { errorResponse, parseErrorForResponse } = require("@src/utils/responseHandler/error");
const STATUS_CODES = require("@src/constants/statusCode");

const LOG = "[SUB_ACTIVE]";

async function getActive(req, res) {
    try {

        const userId = req.user?.sub;
        const agencyId = req.user?.agencyId;

        if (!userId) {
            return errorResponse(res, {
                message: 'User ID not found in token',
                statusCode: STATUS_CODES.UNAUTHORIZED
            });
        }

        if (!agencyId) {
            return errorResponse(res, {
                message: 'Agency not linked. Please refresh session or log in again.',
                statusCode: STATUS_CODES.BAD_REQUEST,
                code: 'AGENCY_NOT_LINKED',
            });
        }

        const populatePackage = req.query.populatePackage !== 'false';

        const subscription = await getActiveSubscription(userId, {
            agencyId,
            populatePackage,
        });


        if (!subscription) {
            const now = new Date();
            const existsForAgency = await SubscriptionModel.exists(
                getActiveSubscriptionQuery(null, now, agencyId)
            );

            if (existsForAgency) {
                return errorResponse(res, {
                    message: 'Session is outdated. Please refresh or log in again.',
                    statusCode: STATUS_CODES.UNAUTHORIZED,
                    code: 'STALE_SESSION',
                });
            }

            return errorResponse(res, {
                message: 'No active subscription found',
                statusCode: STATUS_CODES.NOT_FOUND
            });
        }

        const detailedFeatures = (subscription.features || []).map(f => ({
            module: f.module,
            currentUsage: f.currentUsage || 0,
            maxLimit: f.maxLimit,
            usageType: f.usageType
        }));

        const { agencyId: _, ...cleanSubscription } = subscription;
        const responseData = {
            ...cleanSubscription,
            features: detailedFeatures
        };

        return successResponse(res, {
            message: 'Active subscription details fetched successfully',
            data: responseData
        });

    } catch (error) {
        return errorResponse(res, parseErrorForResponse(error));
    }
}

module.exports = getActive;
