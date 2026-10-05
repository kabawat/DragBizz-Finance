function readCashfreeConfig(secret) {
    return {
        clientId: secret.cashfree.clientId,
        clientSecret: secret.cashfree.clientSecret,
        environment: secret.cashfree.environment,
        apiVersion: secret.cashfree.apiVersion,
        returnUrl: secret.cashfree.returnUrl,
        notifyUrl: secret.cashfree.notifyUrl,
        serverUrl: secret.server.url
    };
}

module.exports = { readCashfreeConfig };
