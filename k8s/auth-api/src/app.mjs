// @ts-check
import express from "express";

import { serviceAvailability } from "./middleware/availability.mjs";
import { healthRouter } from "./routes/health.mjs";
import { webauthnRouter } from "./routes/webauthn.mjs";

const app = express();

app.disable("x-powered-by");
app.use(express.json());

app.use("/", healthRouter);

app.use(serviceAvailability);

app.use(webauthnRouter);

export { app };
