const createSubscriptionService = require('./create.service');
const getSubscriptionService = require('./get.service');
const cancelSubscriptionService = require('./cancel.service');

class SubscriptionService {
    static async createSubscription(subscriptionData) {
        return createSubscriptionService.createSubscription(subscriptionData);
    }

    static async getActiveSubscription(userId, options = {}) {
        return getSubscriptionService.getActiveSubscription(userId, options);
    }

    static async getUserSubscriptions(userId, options = {}) {
        return getSubscriptionService.getUserSubscriptions(userId, options);
    }

    static async getSubscriptionById(subscriptionId, userId) {
        return getSubscriptionService.getSubscriptionById(subscriptionId, userId);
    }

    static async cancelSubscription(subscriptionId, userId, reason = null) {
        return cancelSubscriptionService.cancelSubscription(subscriptionId, userId, reason);
    }

    static async updateSubscriptionStatus(subscriptionId, status) {
        const { SubscriptionModel } = require('@src/models');
        return SubscriptionModel.findByIdAndUpdate(subscriptionId, { status }, { new: true });
    }
}

module.exports = SubscriptionService;
