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

class RetailPaymentClient {
    constructor() {
        this.client = null;
        this.serverAddress = null;
    }

    initialize() {
        if (this.client) return this.client;

        const protoDir = path.join(process.cwd(), 'proto/clients/retailer/payment');
        const protoPath = path.join(protoDir, 'retailPayment.proto');

        const packageDefinition = protoLoader.loadSync(protoPath, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
            includeDirs: [protoDir],
        });

        const retailProto = grpc.loadPackageDefinition(packageDefinition).retailer.retailPayment;
        this.serverAddress = getRetailerAddress();

        this.client = new retailProto.RetailPaymentService(
            this.serverAddress,
            getChannelCredentials(),
            {
                'grpc.max_receive_message_length': 256 * 1024,
                'grpc.max_send_message_length': 256 * 1024,
            }
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
        return waitForReady(this.getClient(), this.serverAddress, 'RetailPayment gRPC', deadlineSeconds);
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

    getPaymentCollectLinkInfo(publicToken) {
        return this.promisifyCall('GetPaymentCollectLinkInfo', { publicToken });
    }

    applyCustomerPayment(payload) {
        return this.promisifyCall('ApplyCustomerPayment', payload);
    }

    resolveFinanceIntent(publicToken) {
        return this.promisifyCall('ResolveFinanceIntent', { publicToken });
    }

    beginFinanceCheckout(payload) {
        return this.promisifyCall('BeginFinanceCheckout', payload);
    }

    getGatewayCredentialForAttempt(payload) {
        return this.promisifyCall('GetGatewayCredentialForAttempt', payload);
    }

    applyGatewaySettlement(payload) {
        return this.promisifyCall('ApplyGatewaySettlement', payload);
    }
}

module.exports = new RetailPaymentClient();

