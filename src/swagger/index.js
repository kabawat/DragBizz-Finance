const SECRET = require('@config/env.config');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'DragBizz Subscription Service API',
            version: '0.1.0',
            description: 'Subscription and package management service',
        },
        servers: [
            {
                url: SECRET.server.url || 'http://localhost:4002',
                description: 'Current server',
            },
            {
                description: 'Dev server',
                url: 'http://localhost/plans'
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT token obtained from authentication service',
                },
            }
        },
        tags: [
            {
                name: 'Packages',
                description: 'Package/Plan management APIs (Admin only)'
            },
            {
                name: 'Subscriptions',
                description: 'Subscription management APIs'
            },
            {
                name: 'Payments',
                description: 'Payment processing and management APIs'
            },
            {
                name: 'Checkout',
                description: 'Checkout and payment session APIs'
            },
            {
                name: 'Webhooks',
                description: 'Payment provider webhook endpoints'
            }
        ],
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: [
        "./src/swagger/**/*.js"
    ],
};

const specs = swaggerJsdoc(options);

module.exports = specs;

