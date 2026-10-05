const createSubscriptionService = require('./create.service');
const getSubscriptionService = require('./get.service');

class SubscriptionService {
    static async createSubscription(subscriptionData) {
        return createSubscriptionService.createSubscription(subscriptionData);
    }

    static async getActiveSubscription(userId, options = {}) {
        return getSubscriptionService.getActiveSubscription(userId, options);
    }
}

module.exports = SubscriptionService;
