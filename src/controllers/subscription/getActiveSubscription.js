const SubscriptionService = require('@src/services/subscription/subscription.service');
const Response = require('@src/utils/responseHandler/standardized');
const STATUS_CODES = require('@src/constants/statusCode');

async function getActiveSubscriptionController(req, res) {
    try {
        const userId = req.user?.sub || req.query?.userId || req.body?.userId;
        
        if (!userId) {
            return Response.validationError(res, 'User ID is required');
        }

        const subscription = await SubscriptionService.getActiveSubscription(userId);
        
        if (!subscription) {
            return Response.success(res, {
                message: 'No active subscription found',
                data: null
            });
        }

        // Populate features if not already populated
        if (subscription.features && subscription.features.length > 0) {
            const { FeatureModel } = require('@src/models');
            const featureIds = subscription.features
                .map(f => f.feature || f)
                .filter(Boolean);
            
            const features = await FeatureModel.find({
                _id: { $in: featureIds },
                isActive: true,
                deletedAt: null
            }).select('name description category icon isActive').lean();
            
            subscription.features = subscription.features.map(subFeature => {
                const featureId = subFeature.feature?.toString() || subFeature.feature || subFeature.toString();
                const feature = features.find(f => f._id.toString() === featureId);
                return {
                    feature: feature || subFeature.feature,
                    enabled: subFeature.enabled !== false,
                    limit: subFeature.limit || null
                };
            });
        }

        // Also populate package features if available
        if (subscription.packageId && subscription.packageId.features) {
            const { FeatureModel } = require('@src/models');
            const packageFeatureIds = subscription.packageId.features
                .map(f => f.toString())
                .filter(Boolean);
            
            const packageFeatures = await FeatureModel.find({
                _id: { $in: packageFeatureIds },
                isActive: true,
                deletedAt: null
            }).select('name description category icon isActive').lean();
            
            subscription.packageId.features = packageFeatures;
        }

        return Response.success(res, {
            message: 'Active subscription fetched successfully',
            data: subscription
        });
    } catch (error) {
        return Response.handleError(res, error, 'getActiveSubscriptionController');
    }
}

module.exports = getActiveSubscriptionController;

