const { randomUUID } = require('crypto');
const { CoreSettlementOutboxModel } = require('@src/models');

function assertSafePositivePaise(amountPaise) {
    const normalized = Number(amountPaise);
    if (!Number.isSafeInteger(normalized) || normalized <= 0) {
        throw new TypeError('amountPaise must be a positive safe integer');
    }
    return normalized;
}

function normalizeProvider(provider) {
    const normalized = String(provider || '').trim().toUpperCase();
    if (!normalized) {
        throw new TypeError('provider is required');
    }
    return normalized;
}

function normalizeCurrency(currency) {
    const normalized = String(currency || 'INR').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalized)) {
        throw new TypeError('currency must be a three-letter ISO code');
    }
    return normalized;
}

function buildOutboxInsert(input) {
    if (!input?.financeAttemptId) {
        throw new TypeError('financeAttemptId is required');
    }
    if (!input?.intentId && !input?.collectLinkId) {
        throw new TypeError('intentId or collectLinkId is required');
    }
    if (!input?.gatewayPaymentId) {
        throw new TypeError('gatewayPaymentId is required');
    }
    if (!input?.paidAt) {
        throw new TypeError('paidAt is required');
    }

    return {
        settlementId: input.settlementId || randomUUID(),
        financeAttemptId: String(input.financeAttemptId),
        intentId: input.intentId ? String(input.intentId) : null,
        collectLinkId: input.collectLinkId ? String(input.collectLinkId) : null,
        provider: normalizeProvider(input.provider),
        gatewayOrderId: input.gatewayOrderId ? String(input.gatewayOrderId) : null,
        gatewayPaymentId: String(input.gatewayPaymentId),
        gatewayEventId: input.gatewayEventId ? String(input.gatewayEventId) : null,
        amountPaise: assertSafePositivePaise(input.amountPaise),
        currency: normalizeCurrency(input.currency),
        paymentMethod: input.paymentMethod ? String(input.paymentMethod).slice(0, 64) : null,
        paidAt: new Date(input.paidAt),
        status: 'PENDING',
        attempts: 0,
        maxAttempts: input.maxAttempts || undefined,
        nextAttemptAt: input.nextAttemptAt ? new Date(input.nextAttemptAt) : new Date(),
        retentionExpiresAt: input.retentionExpiresAt ? new Date(input.retentionExpiresAt) : null,
    };
}

async function enqueueSettlement(input, { session } = {}) {
    const insert = buildOutboxInsert(input);

    try {
        return await CoreSettlementOutboxModel.findOneAndUpdate(
            { financeAttemptId: insert.financeAttemptId },
            { $setOnInsert: insert },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true,
                runValidators: true,
                ...(session ? { session } : {}),
            }
        );
    } catch (error) {
        if (error?.code !== 11000) throw error;

        const existing = await CoreSettlementOutboxModel.findOne({
            $or: [
                { financeAttemptId: insert.financeAttemptId },
                { provider: insert.provider, gatewayPaymentId: insert.gatewayPaymentId },
            ],
        }).session(session || null);

        if (existing) return existing;
        throw error;
    }
}

function buildSettlementPayload(outbox) {
    const amountPaise = assertSafePositivePaise(outbox?.amountPaise);
    const paidAt = new Date(outbox?.paidAt);

    if (Number.isNaN(paidAt.getTime())) {
        throw new TypeError('outbox paidAt is invalid');
    }

    return {
        settlementId: String(outbox.settlementId),
        financeAttemptId: String(outbox.financeAttemptId),
        intentId: outbox.intentId ? String(outbox.intentId) : '',
        collectLinkId: outbox.collectLinkId ? String(outbox.collectLinkId) : String(outbox.intentId || ''),
        provider: normalizeProvider(outbox.provider),
        gatewayOrderId: outbox.gatewayOrderId ? String(outbox.gatewayOrderId) : '',
        gatewayPaymentId: String(outbox.gatewayPaymentId),
        gatewayEventId: outbox.gatewayEventId ? String(outbox.gatewayEventId) : '',
        amountPaise: String(amountPaise),
        currency: normalizeCurrency(outbox.currency),
        paymentMethod: outbox.paymentMethod ? String(outbox.paymentMethod) : '',
        paidAt: paidAt.toISOString(),
    };
}

module.exports = {
    enqueueSettlement,
    buildSettlementPayload,
};

