const swaggerJsDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "RBAC User API",
      version: "1.0.0",
      description: "Signup, Login, and Admin create-salesman API",
    },
    servers: [
      {
        url: "http://localhost:5000",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./routes/*.js"], // points to your route files with swagger comments
};

const swaggerSpec = swaggerJsDoc(options);
module.exports = swaggerSpec;