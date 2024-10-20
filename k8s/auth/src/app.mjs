// @ts-check
import express from "express";

import { connection } from "./models/index.mjs";
import { healtzRouter } from "./routes/index.mjs";

const app = express();

app.disable("x-powered-by");
app.use(express.json());

app.use(healtzRouter);

app.use((req, res, next) => {
  if (connection && connection.readyState === 1) {
    return next();
  }

  // Use RFC 7807 Problem Details to return structured error response
  res.status(503).json({
    detail: "The database connection is not ready yet. Please try again later.",
    instance: req.originalUrl,
    status: 503,
    title: "Service Unavailable",
    type: "https://example.com/probs/db-not-ready",
  });
});

export { app };
