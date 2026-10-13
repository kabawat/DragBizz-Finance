const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const SECRET = require("@src/config/env.config");

class RetailerGrpcClient {
    constructor() {
        this.client = null;
        this.serverAddress = null;
    }

    initialize() {
        if (this.client) return this.client;

        const protoPath = path.join(process.cwd(), "proto/clients/retailer.proto");

        const packageDefinition = protoLoader.loadSync(protoPath, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
        });

        const retailerProto = grpc.loadPackageDefinition(packageDefinition).retailer.subscription;

        const grpcHost = SECRET.grpc?.retailerHost || '192.168.1.29';
        const grpcPort = SECRET.grpc?.retailerPort || 8001;
        this.serverAddress = `${grpcHost}:${grpcPort}`;

        this.client = new retailerProto.SubscriptionService(
            this.serverAddress,
            grpc.credentials.createInsecure()
        );

        return this.client;
    }

    waitForReady(deadlineSeconds = 10) {
        const client = this.getClient();
        return new Promise((resolve, reject) => {
            const deadline = new Date();
            deadline.setSeconds(deadline.getSeconds() + deadlineSeconds);
            client.waitForReady(deadline, (err) => {
                if (err) {
                    return reject(
                        new Error(
                            `[Core gRPC] Channel not READY within ${deadlineSeconds}s — ${err.message}`
                        )
                    );
                }
                resolve();
            });
        });
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

module.exports = new RetailerGrpcClient();
