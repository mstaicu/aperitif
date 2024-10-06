// @ts-check
import express from "express";

import {
  // registerStartRouter,
  // registerFinishRouter,
  // webauthnRegisterFinish,
  // webauthnRegisterStart,
  // webauthnAuthStart,
  // webauthnAuthFinish,
  healtzRouter,
} from "./routes/index.mjs";

const app = express();

app.disable("x-powered-by");

app.use(express.json());

app.use(healtzRouter);

// app.use(registerStartRouter);
// app.use(registerFinishRouter);
// app.use(webauthnRegisterStart);
// app.use(webauthnRegisterFinish);
// app.use(webauthnAuthStart);
// app.use(webauthnAuthFinish);

export { app };
