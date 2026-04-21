const { SubscriptionModel } = require('@src/models');
const { logSubscriptionEvent } = require('@src/utils/audit/audit.logger');
const { PACKAGE_MODULES } = require('@src/constants/enum/package.enum');
const { processFeatures, calculateProratedCredit, getCacheKey } = require('./helpers');
const { deleteCache } = require('@src/services/cache.service');

function resolveChangeStrategy(type, existingSubscription) {
    const now = new Date();

    if (type === 'UPGRADE') {
        return {
            immediate: true,
            newStatus: 'ACTIVE',
            cancelReason: 'Upgraded to higher package',
            cancelledAt: now,
            applyProration: true,
            eventCreated: 'SUBSCRIPTION_UPGRADED',
            eventCancelled: 'SUBSCRIPTION_CANCELLED',
        };
    }

    const currentEndDate = new Date(existingSubscription.endDate);

    if (currentEndDate <= now) {
        return {
            immediate: true,
            newStatus: 'ACTIVE',
            cancelReason: 'Downgraded to lower package',
            cancelledAt: now,
            applyProration: false,
            eventCreated: 'SUBSCRIPTION_DOWNGRADED',
            eventCancelled: null,
        };
    }

    return {
        immediate: false,
        newStatus: 'PENDING',
        cancelReason: 'Scheduled downgrade to lower package',
        cancelledAt: currentEndDate,
        applyProration: false,
        eventCreated: 'SUBSCRIPTION_DOWNGRADE_SCHEDULED',
        eventCancelled: null,
        scheduledStartDate: currentEndDate,
    };
}

async function changeSubscription(type, existingSubscription, newPackage, payment, months, ipAddress, userAgent) {
    const strategy = resolveChangeStrategy(type, existingSubscription);

    // ── 1. Cancel / mark existing subscription ──────────────────────────────
    existingSubscription.status = 'CANCELLED';
    existingSubscription.cancelledAt = strategy.cancelledAt;
    existingSubscription.cancellationReason = strategy.cancelReason;
    existingSubscription.autoRenew = false;
    await existingSubscription.save();

    if (strategy.eventCancelled) {
        await logSubscriptionEvent(strategy.eventCancelled, {
            subscriptionId: existingSubscription._id,
            userId: existingSubscription.userId,
            packageId: existingSubscription.packageId,
            reason: strategy.cancelReason,
            ipAddress,
            userAgent,
        });
    }

    // ── 2. Calculate new dates ───────────────────────────────────────────────
    const startDate = strategy.immediate ? new Date() : new Date(strategy.scheduledStartDate);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + Number(months));

    // ── 3. Prorated credit (only for upgrades) ───────────────────────────────
    const proratedCredit = strategy.applyProration
        ? calculateProratedCredit(existingSubscription, months)
        : 0;

    // ── 4. Create new subscription ───────────────────────────────────────────
    const processedFeatures = processFeatures(newPackage.features)
        .filter(f => PACKAGE_MODULES.includes(f.module));

    const subscription = new SubscriptionModel({
        userId: existingSubscription.userId,
        agencyId: existingSubscription.agencyId,
        packageId: newPackage._id,
        paymentId: payment._id,
        status: strategy.newStatus,
        billingCycle: payment.billingCycle,
        startDate,
        endDate,
        autoRenew: false,
        nextBillingDate: months === 1 ? endDate : null,
        features: processedFeatures,
    });

    await subscription.save();

    // ── 5. Update payment ────────────────────────────────────────────────────
    payment.subscriptionId = subscription._id;

    if (proratedCredit > 0) {
        payment.metadata = {
            ...(payment.metadata || {}),
            proratedCredit,
            originalAmount: payment.amount
        };
        payment.amount = Math.max(0, payment.amount - proratedCredit);
    }

    await payment.save();

    // ── 6. Invalidate cache — plan changed, stale data must not be served ────
    const cacheKey = getCacheKey(existingSubscription.userId);
    await deleteCache(cacheKey).catch(() => { });

    // ── 7. Audit log ─────────────────────────────────────────────────────────
    await logSubscriptionEvent(strategy.eventCreated, {
        subscriptionId: subscription._id,
        userId: existingSubscription.userId,
        oldPackageId: existingSubscription.packageId,
        newPackageId: newPackage._id,
        paymentId: payment._id,
        ...(proratedCredit > 0 && { proratedCredit }),
        ...(strategy.scheduledStartDate && { scheduledStartDate: startDate }),
        ipAddress,
        userAgent,
    });

    return subscription;
}

module.exports = { changeSubscription };
