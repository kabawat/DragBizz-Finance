const { assertGatewayContract } = require('@src/lib/payment/contract');

const gateways = new Map();

function normalizeGatewayId(value) {
    return String(value || '').trim().toLowerCase();
}

function registerGateway(id, definition) {
    const key = normalizeGatewayId(id);
    if (!key || typeof definition?.create !== 'function' || typeof definition?.readConfig !== 'function') {
        throw new Error(`Cannot register payment gateway "${id}"`);
    }
    gateways.set(key, definition);
    return definition;
}

function listGateways() {
    return [...gateways.keys()];
}

function getGatewayDefinition(name) {
    const id = normalizeGatewayId(name);
    const definition = gateways.get(id);
    if (!definition) {
        throw new Error(`Unsupported payment gateway: ${name}. Supported: ${listGateways().join(', ')}`);
    }
    return definition;
}

function buildGateway(name, config) {
    const definition = getGatewayDefinition(name);
    return assertGatewayContract(definition.create(config || {}));
}

module.exports = {
    normalizeGatewayId,
    registerGateway,
    listGateways,
    getGatewayDefinition,
    buildGateway
};
