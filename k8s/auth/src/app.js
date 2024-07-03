// @ts-check
import express from "express";

import { registerStartRouter, registerFinishRouter } from "./routes/index.js";

const app = express();

app.disable("x-powered-by");

app.use(express.json());

app.get("/healthz", (_, res) => {
  res.sendStatus(200);
});

app.use(registerStartRouter);
app.use(registerFinishRouter);

export { app };
