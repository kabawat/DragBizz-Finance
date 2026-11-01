const SECRET = require('@config/env.config');
const { buildGateway, getGatewayDefinition, normalizeGatewayId } = require('./registry');

require('./gateways');

function resolveGateway(name) {
    const id = normalizeGatewayId(name || SECRET.payment.gateway);
    const definition = getGatewayDefinition(id);
    return buildGateway(id, definition.readConfig(SECRET));
}

function getActiveGateway() {
    return resolveGateway(SECRET.payment.gateway);
}

module.exports = {
    resolveGateway,
    getActiveGateway
};
