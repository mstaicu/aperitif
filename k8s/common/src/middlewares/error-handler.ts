import { Request, Response, NextFunction } from "express";

import { CustomError } from "../errors";

export const errorHandler = (
  error: Error,
  _: Request,
  response: Response,
  next: NextFunction
) => {
  response.set("Content-Type", "application/problem+json");

  if (error instanceof CustomError) {
    return response.status(error.statusCode).json(error.serializeResponse());
  }

  return response.status(400).json({
    title: "Something went wrong",
    status: 400,
  });
};
