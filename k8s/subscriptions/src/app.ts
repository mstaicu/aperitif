import express from "express";

import {
  NotFoundError,
  errorHandler,
  requireBearerAuth,
} from "@tartine/common";

import { stripeWebhookRouter, stripeSubscribeRouter } from "./routes";

const app = express();

app.use(stripeWebhookRouter);

app.use(requireBearerAuth);
app.use(stripeSubscribeRouter);

app.get("*", (_, __, next) => next(new NotFoundError()));

app.use(errorHandler);

export { app };
