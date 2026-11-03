const grpc = require('@grpc/grpc-js');
const fs = require('fs');
const SECRET = require('@src/config/env.config');

function getRetailerAddress(customHost, customPort) {
    const host = customHost || SECRET.grpc.retailer.host;
    const port = customPort || SECRET.grpc.retailer.port;
    return `${host}:${port}`;
}

function getChannelCredentials() {
    const caPath = SECRET.grpc.tls.coreCaPath;
    const keyPath = SECRET.grpc.tls.financeKeyPath;
    const certPath = SECRET.grpc.tls.financeCertPath;

    if (caPath && keyPath && certPath) {
        return grpc.credentials.createSsl(
            fs.readFileSync(caPath),
            fs.readFileSync(keyPath),
            fs.readFileSync(certPath)
        );
    }

    return grpc.credentials.createInsecure();
}

function createCallMetadata() {
    const metadata = new grpc.Metadata();
    if (SECRET.internalServiceSecret) {
        metadata.set('x-internal-secret', SECRET.internalServiceSecret);
    }
    return metadata;
}

function handleGrpcError(error) {
    const statusMap = {
        [grpc.status.INVALID_ARGUMENT]: 400,
        [grpc.status.FAILED_PRECONDITION]: 409,
        [grpc.status.NOT_FOUND]: 404,
        [grpc.status.PERMISSION_DENIED]: 403,
        [grpc.status.RESOURCE_EXHAUSTED]: 429,
        [grpc.status.UNAUTHENTICATED]: 401,
        [grpc.status.UNAVAILABLE]: 503,
        [grpc.status.INTERNAL]: 500,
    };

    return {
        code: error.code !== undefined ? error.code : grpc.status.UNKNOWN,
        message: error.message || 'Unknown error',
        details: error.details || {},
        httpStatus: statusMap[error.code] || 500,
    };
}

function waitForReady(client, serverAddress, serviceName = 'Retailer gRPC', deadlineSeconds = 10) {
    return new Promise((resolve, reject) => {
        const deadline = new Date(Date.now() + deadlineSeconds * 1000);
        client.waitForReady(deadline, (err) => {
            if (err) {
                return reject(new Error(`[${serviceName}] Channel not READY within ${deadlineSeconds}s at ${serverAddress} — ${err.message}`));
            }
            resolve();
        });
    });
}

module.exports = {
    getRetailerAddress,
    getChannelCredentials,
    createCallMetadata,
    handleGrpcError,
    waitForReady,
};

