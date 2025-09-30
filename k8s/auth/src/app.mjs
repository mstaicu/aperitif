// @ts-check
import express from "express";

import { serviceAvailability } from "./middleware/availability.mjs";
import { webauthnRouter } from "./routes/credentials.mjs";
import { healthRouter } from "./routes/health.mjs";

const app = express();

app.disable("x-powered-by");
app.use(express.json());

app.use("/", healthRouter);

app.use(serviceAvailability);

app.use(webauthnRouter);

export { app };
