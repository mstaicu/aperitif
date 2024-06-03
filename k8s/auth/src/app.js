// @ts-check
import express from "express";

// const swaggerUi = require('swagger-ui-express');
// const swaggerJsdoc = require('swagger-jsdoc');

// import { errorHandler, NotFoundError } from "@tartine/common";

const app = express();

app.disable("x-powered-by");

app.use(express.json());

/**
 * OpenAPI 3.0+
 */

// const options = {
//   swaggerDefinition: {
//     openapi: "3.0.0",
//     info: {
//       title: "Sample API",
//       version: "1.0.0",
//     },
//     servers: [
//       {
//         url: "http://localhost:3000",
//       },
//     ],
//   },
//   apis: [path.join(__dirname, "routes/*.js")], // Path to the API docs
// };

// const swaggerSpec = swaggerJsdoc(options);

// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * TODO: Add JSDoc Comments to Your Routes
 */

app.get("/healthz", (_, res) => {
  /**
   * Implement any checks to determine readiness
   * For example, check database connections, cache availability, etc.
   * If the application is ready, return a 200 OK response
   */
  res.sendStatus(200);
});

// app.get("*", (_, __, next) => next(new NotFoundError()));

// app.use(errorHandler);

export { app };
