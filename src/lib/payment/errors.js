class GatewayError extends Error {
    constructor(message, { code = 'GATEWAY_ERROR', statusCode = 502 } = {}) {
        super(message);
        this.name = 'GatewayError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

module.exports = { GatewayError };
