const createSubscriptionService = require('./subscription.create.service');
const getSubscriptionService = require('./subscription.get.service');
const cancelSubscriptionService = require('./subscription.cancel.service');

class SubscriptionService {
    static async createSubscription(subscriptionData) {
        return createSubscriptionService.createSubscription(subscriptionData);
    }

    static async getActiveSubscription(userId) {
        return getSubscriptionService.getActiveSubscription(userId);
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
}

module.exports = SubscriptionService;
