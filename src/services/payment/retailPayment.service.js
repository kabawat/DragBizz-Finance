const retailPaymentGrpcClient = require('@src/lib/grpc/clients/retailer/retailPayment.client');
const { buildGateway } = require('@src/lib/payment/registry');
const logger = require('@src/utils/logger');
require('@src/lib/payment/gateways');

class RetailPaymentError extends Error {
    constructor(message, statusCode = 400, code = 'RETAIL_PAYMENT_ERROR') {
        super(message);
        this.name = 'RetailPaymentError';
        this.statusCode = statusCode;
        this.code = code;
    }
}

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
                clientId: credentials?.clientId || '',
                clientSecret: credentials?.clientSecret || '',
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

async function getCollectLinkDetails(publicToken) {
    if (!publicToken) {
        throw new RetailPaymentError('Payment token is required', 400, 'TOKEN_REQUIRED');
    }

    const info = await retailPaymentGrpcClient.getPaymentCollectLinkInfo(publicToken);
    if (!info.success) {
        throw new RetailPaymentError(info.message || 'Payment link not valid', 400, info.status || 'LINK_INVALID');
    }

    return {
        collectLinkId: info.collectLinkId,
        agencyId: info.agencyId,
        storeId: info.storeId,
        customerId: info.customerId,
        store: info.store,
        customer: info.customer,
        totalDue: info.totalDue,
        linkAmount: info.linkAmount,
        currency: info.currency || 'INR',
        collectType: info.collectType,
        invoiceId: info.invoiceId,
        status: info.status,
        expiresAt: info.expiresAt,
        gatewayType: info.gatewayType,
        gatewayMode: info.gatewayMode,
        hasGateway: Boolean(info.credentials?.keyId || info.credentials?.clientId || info.credentials?.secretKey),
    };
}

async function createRetailCheckout({ token, amount, notes }) {
    if (!token) {
        throw new RetailPaymentError('Payment token is required', 400, 'TOKEN_REQUIRED');
    }

    const info = await retailPaymentGrpcClient.getPaymentCollectLinkInfo(token);
    if (!info.success) {
        throw new RetailPaymentError(info.message || 'Payment link is not valid or has expired', 400, 'LINK_NOT_FOUND');
    }

    let payableAmount = amount !== undefined && amount !== null ? Number(amount) : Number(info.linkAmount || info.totalDue);
    if (!payableAmount || payableAmount <= 0) {
        throw new RetailPaymentError('Payable amount must be greater than 0', 400, 'INVALID_AMOUNT');
    }

    if (info.totalDue > 0 && payableAmount > info.totalDue * 2) {
        throw new RetailPaymentError(`Payable amount cannot exceed ₹${info.totalDue * 2}`, 400, 'AMOUNT_EXCEEDS_DUE');
    }

    const gatewayType = (info.gatewayType || 'RAZORPAY').toLowerCase();
    const storeConfig = buildStoreGatewayConfig(gatewayType, info.credentials, info.gatewayMode);

    if (!storeConfig.keyId && !storeConfig.clientId && !storeConfig.secretKey) {
        throw new RetailPaymentError('Store payment gateway credentials are not configured', 503, 'GATEWAY_NOT_CONFIGURED');
    }

    const gateway = buildGateway(gatewayType, storeConfig);

    const merchantOrderId = `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const gatewayOrder = await gateway.createOrder({
        amount: payableAmount,
        currency: info.currency || 'INR',
        orderId: merchantOrderId,
        email: info.customer?.email || undefined,
        phone: info.customer?.phone || undefined,
        notes: {
            token,
            collectLinkId: info.collectLinkId,
            storeId: info.storeId,
            customerId: info.customerId,
            notes: notes || undefined,
        },
    });

    logger.info('retail_payment.checkout_created', {
        collectLinkId: info.collectLinkId,
        gatewayType,
        gatewayOrderId: gatewayOrder.gatewayOrderId,
        amount: payableAmount,
    });

    return {
        token,
        collectLinkId: info.collectLinkId,
        gateway: String(gatewayType).toUpperCase(),
        gatewayOrderId: gatewayOrder.gatewayOrderId,
        amount: payableAmount,
        currency: info.currency || 'INR',
        checkout: gatewayOrder.checkout,
        store: info.store,
        customer: info.customer,
    };
}

async function verifyRetailPayment({
    token,
    gatewayOrderId,
    gatewayPaymentId,
    signature,
    amount,
    paymentMethod = 'UPI',
    notes,
}) {
    if (!token) {
        throw new RetailPaymentError('Payment token is required', 400, 'TOKEN_REQUIRED');
    }

    const info = await retailPaymentGrpcClient.getPaymentCollectLinkInfo(token);
    if (!info.success && info.status !== 'PAID') {
        throw new RetailPaymentError(info.message || 'Payment link not valid', 400, 'LINK_INVALID');
    }

    const gatewayType = (info.gatewayType || 'RAZORPAY').toLowerCase();
    const storeConfig = buildStoreGatewayConfig(gatewayType, info.credentials, info.gatewayMode);

    const gateway = buildGateway(gatewayType, storeConfig);

    // Verify signature with store gateway secret
    await gateway.verifyPayment({
        gatewayOrderId,
        gatewayPaymentId,
        signature,
    });

    const paidAmount = Number(amount) || Number(info.linkAmount || info.totalDue);

    // Call Core via gRPC to record Customer Payment and update ledger/invoices
    const applyResult = await retailPaymentGrpcClient.applyCustomerPayment({
        collectLinkId: info.collectLinkId,
        storeId: info.storeId,
        customerId: info.customerId,
        amount: paidAmount,
        paymentMethod: paymentMethod || 'UPI',
        gatewayPaymentId,
        gatewayOrderId,
        idempotencyKey: `retail:gateway:${gatewayPaymentId || gatewayOrderId}`,
        notes: notes || undefined,
    });

    if (!applyResult.success) {
        logger.error('retail_payment.apply_ledger_failed', {
            collectLinkId: info.collectLinkId,
            error: applyResult.message,
        });
        throw new RetailPaymentError(applyResult.message || 'Failed to update ledger', 500, 'LEDGER_UPDATE_FAILED');
    }

    logger.info('retail_payment.verified_and_applied', {
        collectLinkId: info.collectLinkId,
        paymentId: applyResult.paymentId,
        remainingDue: applyResult.remainingDue,
    });

    return {
        success: true,
        message: 'Payment verified and customer ledger updated successfully',
        paymentId: applyResult.paymentId,
        remainingDue: applyResult.remainingDue,
        amount: paidAmount,
        currency: info.currency || 'INR',
    };
}

module.exports = {
    getCollectLinkDetails,
    createRetailCheckout,
    verifyRetailPayment,
    RetailPaymentError,
};

