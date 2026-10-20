const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const SECRET = require("@src/config/env.config");
const logger = require("@src/utils/logger");

const CALL_TIMEOUT_MS = 30000;

class UtilityGrpcClient {
    constructor() {
        this.client = null;
        this.serverAddress = null;
    }

    // Initialize gRPC client
    initialize() {
        if (this.client) return this.client;

        const protoDir = path.join(process.cwd(), "proto/clients/utility");
        const protoPath = path.join(protoDir, "utility.proto");

        const packageDefinition = protoLoader.loadSync(protoPath, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
            includeDirs: [protoDir],
        });

        const utilityProto = grpc.loadPackageDefinition(packageDefinition).utility;
        const grpcHost = SECRET.grpc?.utilityHost || "localhost";
        const grpcPort = SECRET.grpc?.utilityPort || 5003;
        this.serverAddress = `${grpcHost}:${grpcPort}`;

        const channelOptions = {
            "grpc.max_receive_message_length": 50 * 1024 * 1024,
            "grpc.max_send_message_length": 50 * 1024 * 1024,
            "grpc.keepalive_time_ms": 30000,
            "grpc.keepalive_timeout_ms": 5000,
        };

        this.client = new utilityProto.UtilityService(
            this.serverAddress,
            grpc.credentials.createInsecure(),
            channelOptions
        );

        return this.client;
    }

    // Wait for gRPC channel readiness
    waitForReady(deadlineSeconds = 10) {
        const client = this.getClient();
        return new Promise((resolve, reject) => {
            const deadline = new Date();
            deadline.setSeconds(deadline.getSeconds() + deadlineSeconds);
            client.waitForReady(deadline, (err) => {
                if (err) {
                    return reject(new Error(`[Utility gRPC] Channel not READY within ${deadlineSeconds}s — ${err.message}`));
                }
                resolve();
            });
        });
    }

    // Get initialized client instance
    getClient() {
        if (!this.client) {
            this.initialize();
        }
        return this.client;
    }

    // Get current server address
    getAddress() {
        return this.serverAddress;
    }

    // Promisified gRPC caller
    promisifyCall(method, request) {
        const client = this.getClient();
        const deadline = new Date(Date.now() + CALL_TIMEOUT_MS);
        const startedAt = Date.now();

        return new Promise((resolve, reject) => {
            client[method](request, { deadline }, (error, response) => {
                const durationMs = Date.now() - startedAt;
                if (error) {
                    const grpcError = this.handleGrpcError(error);
                    logger.warn("[Utility gRPC] Call failed", {
                        method,
                        durationMs,
                        code: grpcError.code,
                        error: grpcError.message,
                    });
                    return reject(grpcError);
                }
                return resolve(response);
            });
        });
    }

    // Send email via gRPC
    async sendEmail({ to, type, payload }) {
        return this.promisifyCall("SendEmail", {
            to,
            type,
            payload,
        });
    }

    // Upload file via gRPC
    async uploadFile({ key, content, content_type }) {
        return this.promisifyCall("UploadFile", {
            key,
            content,
            content_type: content_type || "application/pdf",
        });
    }

    // Generate signed download URL via gRPC
    async getSignedUrl({ key, expires_in = 300 }) {
        return this.promisifyCall("GetSignedUrl", {
            key,
            expires_in,
        });
    }

    // Map gRPC status codes to error object
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
            message: error.details || error.message || "Unknown error",
            httpStatus: statusMap[error.code] || 500,
        };
    }
}

module.exports = new UtilityGrpcClient();

