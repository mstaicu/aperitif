import express from "express";

import { NotFoundError, errorHandler } from "@tartine/common";

import { stripeCheckoutRouter, stripeWebhookRouter } from "./routes";

const app = express();

app.use(stripeCheckoutRouter);
app.use(stripeWebhookRouter);

app.get("*", (_, __, next) => next(new NotFoundError()));

app.use(errorHandler);

export { app };
