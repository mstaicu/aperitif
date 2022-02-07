import express from "express";
// import cookieSession from "cookie-session";

import { errorHandler, NotFoundError } from "@tartine/common";

import { loginRouter } from "./routes/login";
import { registerRouter } from "./routes/register";

const app = express();

app.use(express.json());

app.use(loginRouter);
app.use(registerRouter);

app.get("*", (_, __, next) => next(new NotFoundError()));

app.use(errorHandler);

export { app };
