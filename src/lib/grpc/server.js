const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const SECRET = require('@src/config/env.config');
const logger = require('@src/utils/logger');

class GrpcServer {
    constructor() {
        this.server = null;
    }

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

    initialize() {
        return new Promise((resolve, reject) => {
            try {
                this.server = new grpc.Server();

                const protoPath = path.join(__dirname, '../../../proto/subscription.proto');
                const packageDefinition = this.loadProto(protoPath);
                const subscriptionProto = packageDefinition.subscription;

                this.registerServices(subscriptionProto);

                const grpcPort = SECRET.grpc?.port || 50052;
                const grpcHost = SECRET.grpc?.host || '0.0.0.0';

                this.server.bindAsync(
                    `${grpcHost}:${grpcPort}`,
                    grpc.ServerCredentials.createInsecure(),
                    (error, port) => {
                        if (error) {
                            logger.error('gRPC Server failed to start', { error: error?.message, stack: error?.stack });
                            return reject(error);
                        }

                        this.server.start();
                        resolve({ host: grpcHost, port });
                    }
                );
            } catch (error) {
                logger.error('Error initializing gRPC server', { error: error?.message, stack: error?.stack });
                reject(error);
            }
        });
    }

    registerServices(_proto) {
    }

    shutdown() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.tryShutdown(() => {
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = new GrpcServer();
