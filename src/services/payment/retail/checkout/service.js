const { randomUUID, createHash } = require('crypto');
const { RetailPaymentAttemptModel, CoreSettlementOutboxModel } = require('@src/models');
const { paymentClient: core } = require('@src/lib/grpc/clients/retailer');
const gateway = require('../gateway');
const { getCredentials } = require('./credentials');
const { buildGateway } = require('@src/lib/payment/registry');
const { buildStoreGatewayConfig } = require('../link/service');
const logger = require('@src/utils/logger');
require('@src/lib/payment/gateways');

function httpError(message, code = 'RETAIL_PAYMENT_ERROR', statusCode = 409) {
    return Object.assign(new Error(message), { code, statusCode });
}

function isHostedToken(token) {
    return /^[A-Za-z0-9_-]{43}$/.test(String(token || ''));
}

function presentAttempt(attempt, info = {}) {
    return {
        financeAttemptId: attempt.financeAttemptId,
        collectLinkId: attempt.intentId,
        gateway: attempt.provider,
        gatewayOrderId: attempt.gatewayOrderId,
        amount: attempt.amountPaise / 100,
        amountPaise: String(attempt.amountPaise),
        currency: attempt.currency,
        checkout: attempt.checkout,
        store: info.store,
        customer: info.customer,
        status: attempt.status,
    };
}

async function getDetails(token) {
    if (!token) {
        throw httpError('Payment token is required', 'TOKEN_REQUIRED', 400);
    }

    if (isHostedToken(token)) {
        const info = await core.resolveFinanceIntent(token);
        if (!info.success) {
            throw httpError('Payment link unavailable', 'LINK_INVALID', 400);
        }
        return {
            ...info,
            processor: 'FINANCE',
            allowPartialPayment: false,
            collectLinkId: info.intentId,
            linkAmount: Number(info.amountPaise) / 100,
            totalDue: Number(info.amountPaise) / 100,
            status: 'PENDING',
            hasGateway: true,
        };
    }

    const info = await core.getPaymentCollectLinkInfo(token);
    if (!info.success) {
        throw httpError(info.message || 'Payment link not valid', info.status || 'LINK_INVALID', 400);
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

async function createCheckout({ token, amount, notes }) {
    if (!token) {
        throw httpError('Payment token is required', 'TOKEN_REQUIRED', 400);
    }

    if (isHostedToken(token)) {
        if (amount !== undefined && amount !== null) {
            throw httpError('Checkout amount is controlled by the payment link', 'CLIENT_AMOUNT_NOT_ALLOWED', 400);
        }
        const info = await getDetails(token);
        if (!['RAZORPAY', 'CASHFREE'].includes(info.gatewayType)) {
            throw httpError('This payment provider is not available for hosted checkout', 'UNSUPPORTED_GATEWAY', 400);
        }
        if (info.gatewayType === 'CASHFREE' && String(info.customer?.phone || '').replace(/\D/g, '').length < 10) {
            throw httpError('The store must add a valid customer phone number before Cashfree checkout', 'CUSTOMER_PHONE_REQUIRED', 400);
        }

        let attempt = await RetailPaymentAttemptModel.findOne({ intentId: info.intentId, isActive: true }).select('+checkout');
        if (!attempt) {
            const id = randomUUID();
            try {
                attempt = await RetailPaymentAttemptModel.create({
                    financeAttemptId: id,
                    intentId: info.intentId,
                    collectLinkId: info.intentId,
                    provider: info.gatewayType,
                    amountPaise: Number(info.amountPaise),
                    currency: info.currency,
                    merchantOrderId: `retail_${id.replace(/-/g, '')}`,
                    expiresAt: info.expiresAt,
                    metadata: { tokenHash: createHash('sha256').update(token).digest('hex') },
                });
            } catch (failure) {
                if (failure.code !== 11000) throw failure;
                attempt = await RetailPaymentAttemptModel.findOne({ intentId: info.intentId, isActive: true }).select('+checkout');
            }
        }

        if (!attempt) throw httpError('Checkout creation is in progress');
        if (attempt.gatewayOrderId) return presentAttempt(attempt, info);

        await core.beginFinanceCheckout({ publicToken: token, financeAttemptId: attempt.financeAttemptId });
        const config = await getCredentials(attempt, 'CREATE_ORDER');
        const claimed = await RetailPaymentAttemptModel.findOneAndUpdate(
            { _id: attempt._id, status: 'CREATED' },
            { $set: { status: 'ORDER_CREATING' } },
            { new: true }
        );
        if (!claimed) throw httpError('Checkout order is being created. Please retry shortly.', 'CHECKOUT_IN_PROGRESS');

        try {
            const result = await gateway.createOrder(attempt, config, info.customer);
            attempt = await RetailPaymentAttemptModel.findOneAndUpdate(
                { _id: attempt._id, status: 'ORDER_CREATING' },
                {
                    $set: {
                        status: 'CHECKOUT_READY',
                        gatewayOrderId: result.gatewayOrderId,
                        checkout: result,
                        credentialVersion: config.credentialVersion,
                    },
                },
                { new: true }
            ).select('+checkout');
            return presentAttempt(attempt, info);
        } catch (_) {
            throw httpError('Gateway order is being confirmed. Please retry shortly.', 'GATEWAY_ORDER_PENDING', 503);
        }
    }

    // Direct Collect Link checkout
    const info = await core.getPaymentCollectLinkInfo(token);
    if (!info.success) {
        throw httpError(info.message || 'Payment link is not valid or has expired', 'LINK_NOT_FOUND', 400);
    }

    const payableAmount = amount !== undefined && amount !== null ? Number(amount) : Number(info.linkAmount || info.totalDue);
    if (!payableAmount || payableAmount <= 0) {
        throw httpError('Payable amount must be greater than 0', 'INVALID_AMOUNT', 400);
    }
    if (info.totalDue > 0 && payableAmount > info.totalDue * 2) {
        throw httpError(`Payable amount cannot exceed ₹${info.totalDue * 2}`, 'AMOUNT_EXCEEDS_DUE', 400);
    }

    const gatewayType = (info.gatewayType || 'RAZORPAY').toLowerCase();
    const storeConfig = buildStoreGatewayConfig(gatewayType, info.credentials, info.gatewayMode);
    if (!storeConfig.keyId && !storeConfig.clientId && !storeConfig.secretKey) {
        throw httpError('Store payment gateway credentials are not configured', 'GATEWAY_NOT_CONFIGURED', 503);
    }

    const gw = buildGateway(gatewayType, storeConfig);
    const merchantOrderId = `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const gatewayOrder = await gw.createOrder({
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

async function verifyPayment({
    token,
    gatewayOrderId,
    gatewayPaymentId,
    signature,
    amount,
    paymentMethod = 'UPI',
    notes,
}) {
    if (isHostedToken(token)) {
        throw httpError('This payment is confirmed by gateway webhook. Check its payment status.', 'USE_PAYMENT_STATUS', 409);
    }
    if (!token) {
        throw httpError('Payment token is required', 'TOKEN_REQUIRED', 400);
    }

    const info = await core.getPaymentCollectLinkInfo(token);
    if (!info.success && info.status !== 'PAID') {
        throw httpError(info.message || 'Payment link not valid', 'LINK_INVALID', 400);
    }

    const gatewayType = (info.gatewayType || 'RAZORPAY').toLowerCase();
    const storeConfig = buildStoreGatewayConfig(gatewayType, info.credentials, info.gatewayMode);
    const gw = buildGateway(gatewayType, storeConfig);

    await gw.verifyPayment({
        gatewayOrderId,
        gatewayPaymentId,
        signature,
    });

    const paidAmount = Number(amount) || Number(info.linkAmount || info.totalDue);

    const applyResult = await core.applyCustomerPayment({
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
        throw httpError(applyResult.message || 'Failed to update ledger', 'LEDGER_UPDATE_FAILED', 500);
    }

    return {
        success: true,
        message: 'Payment verified and customer ledger updated successfully',
        paymentId: applyResult.paymentId,
        remainingDue: applyResult.remainingDue,
        amount: paidAmount,
        currency: info.currency || 'INR',
    };
}

async function getStatus({ token, financeAttemptId }) {
    const attempt = await RetailPaymentAttemptModel.findOne({ financeAttemptId }).select('+metadata');
    if (!attempt) {
        throw httpError('Payment attempt not found', 'ATTEMPT_NOT_FOUND', 404);
    }

    const digest = createHash('sha256').update(String(token || '')).digest('hex');
    if (!attempt.metadata?.tokenHash || digest !== attempt.metadata.tokenHash) {
        throw httpError('Invalid payment token', 'TOKEN_INVALID', 403);
    }

    const outbox = await CoreSettlementOutboxModel.findOne({ financeAttemptId }).select('status +coreResponse');
    return {
        financeAttemptId,
        status: outbox?.status === 'DELIVERED' ? 'PAID' : outbox ? 'PENDING_LEDGER_SYNC' : attempt.status,
        amountPaise: String(attempt.amountPaise),
        currency: attempt.currency,
        paymentId: outbox?.coreResponse?.paymentId || null,
        remainingDue: outbox?.coreResponse?.remainingDuePaise != null ? Number(outbox.coreResponse.remainingDuePaise) / 100 : null,
    };
}

module.exports = {
    getDetails,
    createCheckout,
    verifyPayment,
    getStatus,
};

