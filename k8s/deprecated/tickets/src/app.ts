import express from "express";
import cookieSession from "cookie-session";

import {
  NotFoundError,
  errorHandler,
  userCookieHandler,
} from "@tartine/common";

import { allTicketsRouter } from "./routes/all";
import { createTicketRouter } from "./routes/create";
import { showTicketRouter } from "./routes/get";
import { updateTicketRouter } from "./routes/update";

const app = express();

app.use(express.json());
app.use(
  cookieSession({
    signed: false,
  })
);

app.use(userCookieHandler);

app.use(showTicketRouter);
app.use(allTicketsRouter);
app.use(updateTicketRouter);
app.use(createTicketRouter);

app.get("*", (_, __, next) => next(new NotFoundError()));

app.use(errorHandler);

export { app };
