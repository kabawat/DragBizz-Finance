const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const SECRET = require("@src/config/env.config");

class RetailPaymentGrpcClient {
    constructor() {
        this.client = null;
        this.serverAddress = null;
    }

    initialize() {
        if (this.client) return this.client;

        const protoPath = path.join(process.cwd(), "proto/clients/retailPayment.proto");

        const packageDefinition = protoLoader.loadSync(protoPath, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
        });

        const retailProto = grpc.loadPackageDefinition(packageDefinition).retailer.retailPayment;

        const grpcHost = SECRET.grpc?.retailerHost || '192.168.1.29';
        const grpcPort = SECRET.grpc?.retailerPort || 5001;
        this.serverAddress = `${grpcHost}:${grpcPort}`;

        this.client = new retailProto.RetailPaymentService(
            this.serverAddress,
            grpc.credentials.createInsecure()
        );

        return this.client;
    }

    getClient() {
        if (!this.client) {
            this.initialize();
        }
        return this.client;
    }

    promisifyCall(method, request) {
        const client = this.getClient();
        return new Promise((resolve, reject) => {
            client[method](request, (error, response) => {
                if (error) {
                    return reject(this.handleGrpcError(error));
                }
                return resolve(response);
            });
        });
    }

    getPaymentCollectLinkInfo(publicToken) {
        return this.promisifyCall('GetPaymentCollectLinkInfo', { publicToken });
    }

    applyCustomerPayment(payload) {
        return this.promisifyCall('ApplyCustomerPayment', payload);
    }

    handleGrpcError(error) {
        const statusMap = {
            [grpc.status.INVALID_ARGUMENT]: 400,
            [grpc.status.NOT_FOUND]: 404,
            [grpc.status.PERMISSION_DENIED]: 403,
            [grpc.status.RESOURCE_EXHAUSTED]: 429,
            [grpc.status.UNAUTHENTICATED]: 401,
            [grpc.status.UNAVAILABLE]: 503,
            [grpc.status.INTERNAL]: 500,
        };
        return {
            code: error.code !== undefined ? error.code : grpc.status.UNKNOWN,
            message: error.message || "Unknown error",
            details: error.details || {},
            httpStatus: statusMap[error.code] || 500,
        };
    }
}

module.exports = new RetailPaymentGrpcClient();

