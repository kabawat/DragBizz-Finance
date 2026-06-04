const { getActiveSubscription } = require('@src/services/subscription/get.service');
const { SubscriptionModel } = require('@src/models');
const { getActiveSubscriptionQuery } = require('@src/services/subscription/helpers');
const { successResponse } = require("@src/utils/responseHandler/success");
const { errorResponse, parseErrorForResponse } = require("@src/utils/responseHandler/error");
const STATUS_CODES = require("@src/constants/statusCode");

const LOG = "[SUB_ACTIVE]";

async function getActive(req, res) {
    try {
        console.log(`${LOG} [7] getActive: start`, {
            query: req.query,
            userId: req.user?.sub,
            agencyId: req.user?.agencyId,
            tenant: req.user?.tenant,
            role: req.user?.role,
        });

        const userId = req.user?.sub;
        const agencyId = req.user?.agencyId;

        if (!userId) {
            console.log(`${LOG} [7a] getActive: STOP no userId in token`);
            return errorResponse(res, {
                message: 'User ID not found in token',
                statusCode: STATUS_CODES.UNAUTHORIZED
            });
        }

        if (!agencyId) {
            console.log(`${LOG} [7b] getActive: STOP no agencyId in token`);
            return errorResponse(res, {
                message: 'Agency not linked. Please refresh session or log in again.',
                statusCode: STATUS_CODES.BAD_REQUEST,
                code: 'AGENCY_NOT_LINKED',
            });
        }

        const populatePackage = req.query.populatePackage !== 'false';
        console.log(`${LOG} [8] getActive: calling getActiveSubscription`, { userId, agencyId, populatePackage });

        const subscription = await getActiveSubscription(userId, {
            agencyId,
            populatePackage,
        });

        console.log(`${LOG} [9] getActive: service returned`, {
            found: !!subscription,
            id: subscription?._id?.toString?.(),
            status: subscription?.status,
        });

        if (!subscription) {
            const now = new Date();
            const existsForAgency = await SubscriptionModel.exists(
                getActiveSubscriptionQuery(null, now, agencyId)
            );

            if (existsForAgency) {
                console.log(`${LOG} [9a] getActive: STOP STALE_SESSION (wrong userId in JWT)`);
                return errorResponse(res, {
                    message: 'Session is outdated. Please refresh or log in again.',
                    statusCode: STATUS_CODES.UNAUTHORIZED,
                    code: 'STALE_SESSION',
                });
            }

            console.log(`${LOG} [9b] getActive: STOP NOT_FOUND`);
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

        console.log(`${LOG} [10] getActive: success`, { featureCount: detailedFeatures.length });
        return successResponse(res, {
            message: 'Active subscription details fetched successfully',
            data: responseData
        });

    } catch (error) {
        console.log(`${LOG} [ERR] getActive:`, error.message, error.stack);
        return errorResponse(res, parseErrorForResponse(error));
    }
}

module.exports = getActive;
