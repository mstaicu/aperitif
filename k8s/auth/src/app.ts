import express from "express";

import { errorHandler, NotFoundError } from "@tartine/common";

import {
  // loginRouter,
  // registerRouter,
  sendMagicLinkRouter,
  validateMagicTokenRouter,
} from "./routes";

const app = express();

app.use(express.json());

// app.use(loginRouter);
/**
 * TODO: Deprecate register route
 */
// app.use(registerRouter);
app.use(sendMagicLinkRouter);
app.use(validateMagicTokenRouter);

app.get("*", (_, __, next) => next(new NotFoundError()));

app.use(errorHandler);

export { app };
