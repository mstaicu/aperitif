import { Request, Response, NextFunction } from "express";

import { NotAuthorizedError } from "../errors";

export const requireAuthHandler = (
  req: Request,
  _: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(
      new NotAuthorizedError(
        "No authentication credentials found with the current request"
      )
    );
  }

  next();
};
