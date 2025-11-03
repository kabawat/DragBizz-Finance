const swaggerJsdoc = require('swagger-jsdoc');

const specs = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Subscription Service',
      version: '0.1.0',
    },
  },
  apis: [],
});

module.exports = specs;

