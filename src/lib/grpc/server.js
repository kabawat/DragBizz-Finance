const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const SECRET = require('@src/config/env.config');
const logger = require('@src/utils/logger');
// gRPC Server Setup
class GrpcServer {
    constructor() {
        this.server = null;
        this.services = {};
    }

    // Load proto file and create package definition
    loadProto(protoPath, options = {}) {
        const defaultOptions = {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
            includeDirs: [path.join(__dirname, '../../../proto')]
        };

        const packageDefinition = protoLoader.loadSync(
            protoPath,
            { ...defaultOptions, ...options }
        );

        return grpc.loadPackageDefinition(packageDefinition);
    }

    // Initialize gRPC server
    initialize() {
        try {
            this.server = new grpc.Server();

            // Load proto definitions
            const protoPath = path.join(__dirname, '../../../proto/subscription.proto');
            const packageDefinition = this.loadProto(protoPath);
            const subscriptionProto = packageDefinition.subscription;

            // Register services
            this.registerServices(subscriptionProto);

            // Get gRPC port from config
            const grpcPort = 50052;
            const grpcHost = '0.0.0.0';

            // Bind server to port
            this.server.bindAsync(
                `${grpcHost}:${grpcPort}`,
                grpc.ServerCredentials.createInsecure(),
                (error, port) => {
                    if (error) {
                        logger.error('gRPC Server failed to start', { error: error?.message, stack: error?.stack });
                        process.exit(1);
                    }

                    logger.info(`gRPC Server listening on ${grpcHost}:${port}`);
                    this.server.start();
                }
            );

            return this.server;
        } catch (error) {
            logger.error('Error initializing gRPC server', { error: error?.message, stack: error?.stack });
            throw error;
        }
    }

    // Register gRPC services
    registerServices(proto) {

        logger.info('gRPC Server started (no services registered)');
    }

    // Graceful shutdown
    shutdown() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.tryShutdown(() => {
                    logger.info('gRPC Server shut down gracefully');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = new GrpcServer();
