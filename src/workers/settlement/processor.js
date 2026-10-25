const { CoreSettlementOutboxModel, RetailPaymentAttemptModel } = require('@src/models');
const { paymentClient: retailPaymentGrpcClient } = require('@src/lib/grpc/clients/retailer');
const { buildSettlementPayload } = require('@src/services/payment/retail/settlement');
const logger = require('@src/utils/logger');
const { markDelivered, markDeliveryFailure } = require('./state');
const { errorMessage } = require('./config');

async function processCoreSettlementOutbox(
    outbox,
    {
        model = CoreSettlementOutboxModel,
        grpcClient = retailPaymentGrpcClient,
    } = {}
) {
    try {
        const payload = buildSettlementPayload(outbox);
        const response = await grpcClient.applyGatewaySettlement(payload);

        if (!response?.success) {
            throw new Error(response?.message || 'Core did not acknowledge gateway settlement');
        }

        if (model === CoreSettlementOutboxModel && RetailPaymentAttemptModel) {
            await RetailPaymentAttemptModel.updateOne(
                { financeAttemptId: outbox.financeAttemptId },
                { $set: { status: 'SETTLED', isActive: false } },
            );
        }
        await markDelivered(outbox, response, { model });
        logger.info('core_settlement_outbox.delivered', {
            settlementId: outbox.settlementId,
            financeAttemptId: outbox.financeAttemptId,
            paymentId: response.paymentId || null,
        });

        return { delivered: true, response };
    } catch (error) {
        const failure = await markDeliveryFailure(outbox, error, { model });
        logger.error('core_settlement_outbox.delivery_failed', {
            settlementId: outbox.settlementId,
            financeAttemptId: outbox.financeAttemptId,
            attempt: failure.attemptNumber,
            finalAttempt: failure.finalAttempt,
            error: errorMessage(error),
        });

        return { delivered: false, ...failure, error };
    }
}

module.exports = {
    processCoreSettlementOutbox,
};

