const grpc = require('@grpc/grpc-js');
const { timingSafeEqual } = require('crypto');
const SECRET = require('@src/config/env.config');
const { createStoreLink, cancelStoreLink } = require('@src/services/payment/retail/link');

function assertCoreService(call) {
    const expected = SECRET.internalServiceSecret;
    if (!expected) {
        if (SECRET.ENVIRONMENT !== 'production') return;
    } else {
        const supplied = String(call.metadata?.get('x-internal-secret')?.[0] || '');
        const actual = Buffer.from(supplied);
        const configured = Buffer.from(expected);
        if (actual.length === configured.length && timingSafeEqual(actual, configured)) return;
    }
    const error = new Error('Unauthorized Core payment service request');
    error.code = grpc.status.UNAUTHENTICATED;
    throw error;
}

function rpcHandler(serviceFn) {
    return async (call, callback) => {
        try {
            assertCoreService(call);
            if (call.cancelled) return;
            const res = await serviceFn(call.request);
            callback(null, res);
        } catch (error) {
            const statusCode = Number(error.statusCode);
            const metadata = new grpc.Metadata();
            if (statusCode >= 400 && statusCode < 600) {
                metadata.set('payment-status-code', String(statusCode));
                metadata.set('payment-error-code', String(error.code || 'FINANCE_GATEWAY_ERROR'));
            }

            const isAuth = error.code === grpc.status.UNAUTHENTICATED;
            const isClientError = statusCode >= 400 && statusCode < 500;
            const code = isAuth ? grpc.status.UNAUTHENTICATED : isClientError ? grpc.status.INVALID_ARGUMENT : grpc.status.INTERNAL;
            const details = isAuth || isClientError ? error.message : 'Finance gateway operation failed';

            callback({ code, details, metadata });
        }
    };
}

module.exports = {
    CreateStoreGatewayLink: rpcHandler(createStoreLink),
    CancelStoreGatewayLink: rpcHandler(cancelStoreLink),
};
