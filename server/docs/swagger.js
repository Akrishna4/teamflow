const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'TeamFlow API',
      version: '1.0.0',
      description: 'Production-ready OpenAPI 3.1 documentation for TeamFlow, an enterprise-grade collaborative project management platform.',
      contact: {
        name: 'TeamFlow Support',
        email: 'support@teamflow.internal',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local Development Server',
      },
      {
        url: 'https://api.teamflow.internal',
        description: 'Production Server',
      },
    ],
  },
  // Paths to files containing OpenAPI definitions
  apis: [
    path.join(__dirname, 'schemas.yaml'),
    path.join(__dirname, 'paths.yaml')
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
