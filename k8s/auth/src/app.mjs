import express from "express";

import { serviceAvailability } from "./middleware/index.mjs";
import { healtz } from "./routes/index.mjs";

const app = express();

app.disable("x-powered-by");
app.use(express.json());

app.use(healtz);
app.use(serviceAvailability);

export { app };
