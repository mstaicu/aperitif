// @ts-check
import express from "express";

import { router } from "./routes/index.mjs";

const app = express();

app.disable("x-powered-by");
app.use(express.json());

app.use(router);

export { app };
