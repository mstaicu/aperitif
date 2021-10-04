import express from "express";
import cookieSession from "cookie-session";

import { errorHandler, NotFoundError } from "@tartine/common";

import { currentUserRouter } from "./routes/current-user";
import { signinRouter } from "./routes/signin";
import { signoutRouter } from "./routes/signout";
import { signupRouter } from "./routes/signup";

const app = express();

app.use(express.json());
app.use(
  cookieSession({
    signed: false,
  })
);

app.use(currentUserRouter);
app.use(signinRouter);
app.use(signoutRouter);
app.use(signupRouter);

app.get("*", (_, __, next) => next(new NotFoundError()));

app.use(errorHandler);

export { app };
