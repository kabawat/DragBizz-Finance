const logger = require('@src/utils/logger');
const cashfreePaymentLink = require('@src/lib/payment/gateways/cashfree/paymentLink');
const razorpayPaymentLink = require('@src/lib/payment/gateways/razorpay/paymentLink');

function buildStoreGatewayConfig(gatewayType, credentials, mode) {
    const norm = String(gatewayType || 'RAZORPAY').toLowerCase();
    switch (norm) {
        case 'razorpay':
            return {
                keyId: credentials?.keyId || '',
                keySecret: credentials?.keySecret || '',
                webhookSecret: credentials?.webhookSecret || '',
                mode: (mode || 'test').toLowerCase(),
            };
        case 'cashfree':
            return {
                clientId: credentials?.clientId || credentials?.appId || '',
                clientSecret: credentials?.clientSecret || credentials?.secretKey || '',
                environment: (mode || 'sandbox').toLowerCase(),
                apiVersion: '2026-01-01',
            };
        case 'stripe':
            return {
                secretKey: credentials?.secretKey || '',
                publishableKey: credentials?.publishableKey || '',
                webhookSecret: credentials?.webhookSecret || '',
            };
        default:
            return { ...credentials };
    }
}

async function createStoreLink({
    gatewayType,
    credentials,
    gatewayMode,
    amount,
    currency = 'INR',
    description,
    customer,
    notes,
    linkId,
    expiresAt,
}) {
    if (!gatewayType) {
        const error = new Error('Gateway type is required');
        error.code = 'GATEWAY_TYPE_REQUIRED';
        error.statusCode = 400;
        throw error;
    }
    const payableAmount = Number(amount);
    if (!payableAmount || payableAmount <= 0) {
        const error = new Error('Payable amount must be greater than 0');
        error.code = 'INVALID_AMOUNT';
        error.statusCode = 400;
        throw error;
    }

    const norm = String(gatewayType).toLowerCase();
    const config = buildStoreGatewayConfig(norm, credentials, gatewayMode);

    let result;
    if (norm === 'cashfree') {
        result = await cashfreePaymentLink.createPaymentLink(config, {
            amount: payableAmount,
            currency,
            description,
            customer,
            notes,
            linkId,
            expiresAt,
        });
    } else if (norm === 'razorpay') {
        result = await razorpayPaymentLink.createPaymentLink(config, {
            amount: payableAmount,
            currency,
            description,
            customer,
            notes,
            expiresAt,
        });
    } else {
        const error = new Error(`Unsupported gateway type for payment link: ${gatewayType}`);
        error.code = 'UNSUPPORTED_GATEWAY';
        error.statusCode = 400;
        throw error;
    }

    logger.info('retail_payment.gateway_link_created', {
        gatewayType,
        id: result.id,
        amount: payableAmount,
    });

    return {
        id: result.id,
        shortUrl: result.shortUrl,
        short_url: result.shortUrl,
        status: result.status,
        raw: result.raw,
    };
}

async function cancelStoreLink({
    gatewayType,
    credentials,
    gatewayMode,
    gatewayPaymentLinkId,
}) {
    if (!gatewayType) {
        const error = new Error('Gateway type is required');
        error.code = 'GATEWAY_TYPE_REQUIRED';
        error.statusCode = 400;
        throw error;
    }
    if (!gatewayPaymentLinkId) {
        const error = new Error('Gateway payment link ID is required');
        error.code = 'LINK_ID_REQUIRED';
        error.statusCode = 400;
        throw error;
    }

    const norm = String(gatewayType).toLowerCase();
    const config = buildStoreGatewayConfig(norm, credentials, gatewayMode);

    let result;
    if (norm === 'cashfree') {
        result = await cashfreePaymentLink.cancelPaymentLink(config, gatewayPaymentLinkId);
    } else if (norm === 'razorpay') {
        result = await razorpayPaymentLink.cancelPaymentLink(config, gatewayPaymentLinkId);
    } else {
        const error = new Error(`Unsupported gateway type for payment link cancellation: ${gatewayType}`);
        error.code = 'UNSUPPORTED_GATEWAY';
        error.statusCode = 400;
        throw error;
    }

    logger.info('retail_payment.gateway_link_cancelled', {
        gatewayType,
        gatewayPaymentLinkId,
    });

    return {
        success: true,
        raw: result.raw,
    };
}

module.exports = {
    createStoreLink,
    cancelStoreLink,
    buildStoreGatewayConfig,
};

