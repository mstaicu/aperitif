// @ts-check
import express from "express";

import {
  refreshTokenRouter,
  sendTokenRouter,
  exchangeTokenRouter,
} from "./routes/index.js";

const app = express();

app.disable("x-powered-by");

app.use(express.json());

app.get("/healthz", (_, res) => {
  res.sendStatus(200);
});

app.use(sendTokenRouter);
app.use(exchangeTokenRouter);
app.use(refreshTokenRouter);

export { app };
