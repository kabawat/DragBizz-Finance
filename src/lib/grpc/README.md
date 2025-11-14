# gRPC Server Implementation

## Overview
Production-ready gRPC server for Subscription Service with proper error handling, logging, and graceful shutdown.

## Features
- ✅ Protocol Buffers (Protobuf) for efficient serialization
- ✅ HTTP/2 for multiplexing and lower latency
- ✅ Connection pooling and keepalive
- ✅ Retry logic with exponential backoff
- ✅ Comprehensive error handling
- ✅ Graceful shutdown support

## Services

### UsageService
- `CheckUsage`: Check if user can use a feature (has quota available)
- `IncrementUsage`: Increment usage for a feature
- `GetQuota`: Get remaining quota for a feature

### SubscriptionService
- `GetActiveSubscription`: Get active subscription for a user

## Configuration

Environment variables:
- `GRPC_PORT`: gRPC server port (default: 50051)
- `GRPC_HOST`: gRPC server host (default: 0.0.0.0)

## Usage

The gRPC server starts automatically when the subscription service starts.

## Performance

Expected improvements over REST:
- **Latency**: 30-40% reduction
- **Throughput**: 2-5x increase
- **Payload Size**: 50-70% reduction
- **CPU Usage**: 15-30% reduction

