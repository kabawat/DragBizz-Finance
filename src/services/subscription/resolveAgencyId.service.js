const mongoose = require('mongoose');
const { SubscriptionModel } = require('@src/models');
const retailerClient = require('@src/lib/grpc/clients/retailer/retailer.client');
const { getActiveSubscriptionQuery } = require('./helpers');
const logger = require('@src/utils/logger');

// Check sub exists for this user + agency
async function hasActiveSubscriptionForOwner(userId, agencyId) {
    if (!userId || !agencyId || !mongoose.Types.ObjectId.isValid(agencyId)) {
        return false;
    }

    const now = new Date();
    return Boolean(
        await SubscriptionModel.exists(getActiveSubscriptionQuery(userId, now, agencyId))
    );
}

// Retailer confirms user owns tenant (no subdomain-only)
async function resolveAgencyFromRetailer({ userId, tenant }) {
    const subdomain = (tenant || '').trim().toLowerCase();

    if (!userId || !subdomain) {
        return null;
    }

    try {
        const response = await retailerClient.promisifyCall('GetOwnerAgency', {
            userId,
            subdomain,
        });

        if (response?.success && response.agencyId) {
            return response.agencyId;
        }
    } catch (error) {
        logger.warn('Failed to resolve agency from retailer gRPC', {
            userId,
            tenant: subdomain,
            error: error.message,
        });
    }

    return null;
}

// JWT agencyId → retailer → user's latest sub
async function resolveAgencyId({ userId, agencyId, tenant }) {
    if (!userId) {
        return null;
    }

    const normalizedAgencyId = agencyId ? String(agencyId) : null;

    // 1. Token agencyId if valid
    if (normalizedAgencyId && await hasActiveSubscriptionForOwner(userId, normalizedAgencyId)) {
        return normalizedAgencyId;
    }

    // 2. Sync from retailer by tenant
    const resolvedFromRetailer = await resolveAgencyFromRetailer({ userId, tenant });
    if (resolvedFromRetailer && await hasActiveSubscriptionForOwner(userId, resolvedFromRetailer)) {
        return resolvedFromRetailer;
    }

    // 3. Fallback: user's active sub
    const now = new Date();
    const subscription = await SubscriptionModel.findOne(
        getActiveSubscriptionQuery(userId, now, null)
    )
        .select('agencyId')
        .sort({ createdAt: -1 })
        .lean();

    if (subscription?.agencyId) {
        return subscription.agencyId.toString();
    }

    return null;
}

module.exports = {
    resolveAgencyId,
};
