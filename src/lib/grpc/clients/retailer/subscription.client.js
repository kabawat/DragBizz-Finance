const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const {
    getRetailerAddress,
    getChannelCredentials,
    createCallMetadata,
    handleGrpcError,
    waitForReady,
} = require('./channel');

class RetailSubscriptionClient {
    constructor() {
        this.client = null;
        this.serverAddress = null;
    }

    initialize() {
        if (this.client) return this.client;

        const protoDir = path.join(process.cwd(), 'proto/clients/retailer/subscription');
        const protoPath = path.join(protoDir, 'subscription.proto');

        const packageDefinition = protoLoader.loadSync(protoPath, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
            includeDirs: [protoDir],
        });

        const retailerProto = grpc.loadPackageDefinition(packageDefinition).retailer.subscription;
        this.serverAddress = getRetailerAddress();

        this.client = new retailerProto.SubscriptionService(
            this.serverAddress,
            getChannelCredentials()
        );

        return this.client;
    }

    getClient() {
        if (!this.client) {
            this.initialize();
        }
        return this.client;
    }

    getAddress() {
        return this.serverAddress;
    }

    waitForReady(deadlineSeconds = 10) {
        return waitForReady(this.getClient(), this.serverAddress, 'RetailSubscription gRPC', deadlineSeconds);
    }

    promisifyCall(method, request, options = {}) {
        const client = this.getClient();
        const timeoutMs = options.timeoutMs || 10000;
        return new Promise((resolve, reject) => {
            const metadata = createCallMetadata();
            client[method](
                request,
                metadata,
                { deadline: new Date(Date.now() + timeoutMs) },
                (error, response) => {
                    if (error) {
                        return reject(handleGrpcError(error));
                    }
                    return resolve(response);
                }
            );
        });
    }
}

module.exports = new RetailSubscriptionClient();

