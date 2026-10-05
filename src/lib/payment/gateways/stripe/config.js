function readStripeConfig(secret) {
    return {
        secretKey: secret.stripe.secretKey,
        publishableKey: secret.stripe.publishableKey,
        webhookSecret: secret.stripe.webhookSecret
    };
}

module.exports = { readStripeConfig };
