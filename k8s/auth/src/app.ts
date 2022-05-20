import express from "express";

import {
  requireBearerAuth,
  errorHandler,
  NotFoundError,
} from "@tartine/common";

import {
  extendTokenRouter,
  sendMagicLinkRouter,
  validateMagicTokenRouter,
} from "./routes";

const app = express();

app.use(express.json());

app.use(sendMagicLinkRouter);
app.use(validateMagicTokenRouter);

app.use(requireBearerAuth, extendTokenRouter);

app.get("*", (_, __, next) => next(new NotFoundError()));

app.use(errorHandler);

export { app };
