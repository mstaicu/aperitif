import express from "express";

import { errorHandler, NotFoundError } from "@tartine/common";

import { sendMagicLinkRouter, validateMagicTokenRouter } from "./routes";

const app = express();

app.use(express.json());

app.use(sendMagicLinkRouter);
app.use(validateMagicTokenRouter);

app.get("*", (_, __, next) => next(new NotFoundError()));

app.use(errorHandler);

export { app };
