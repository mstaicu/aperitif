import express from "express";
import cookieSession from "cookie-session";

import {
  NotFoundError,
  errorHandler,
  userCookieHandler,
} from "@tartine/common";

import {
  allOrdersRouter,
  cancelOrderRouter,
  getOrderRouter,
  newOrderRouter,
} from "./routes";

const app = express();

app.use(express.json());
app.use(
  cookieSession({
    signed: false,
  })
);

app.use(userCookieHandler);

app.use(allOrdersRouter);
app.use(cancelOrderRouter);
app.use(getOrderRouter);
app.use(newOrderRouter);

app.get("*", (_, __, next) => next(new NotFoundError()));

app.use(errorHandler);

export { app };
