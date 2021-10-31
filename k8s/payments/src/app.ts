import express from "express";
import cookieSession from "cookie-session";

import {
  NotFoundError,
  errorHandler,
  userCookieHandler,
} from "@tartine/common";

import { paymentIntentRouter, stripeWebhookRouter } from "./routes";

const app = express();

app.use(
  cookieSession({
    signed: false,
  })
);

/**
 * Unauthenticated, relies on Stripe signature to check the validity of the payload
 */
app.use(stripeWebhookRouter);

/**
 * Authenticated
 */
app.use(userCookieHandler);
app.use(paymentIntentRouter);

app.get("*", (_, __, next) => next(new NotFoundError()));

app.use(errorHandler);

export { app };
