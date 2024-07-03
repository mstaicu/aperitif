// @ts-check
import express from "express";

import {
  webauthnRegisterFinish,
  webauthnRegisterStart,
} from "./routes/index.js";

const app = express();

app.disable("x-powered-by");

app.use(express.json());

app.get("/healthz", (_, res) => {
  res.sendStatus(200);
});

app.use(webauthnRegisterStart);
app.use(webauthnRegisterFinish);

export { app };
