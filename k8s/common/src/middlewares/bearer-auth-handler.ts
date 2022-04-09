import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

import { BadRequestError } from "../errors";

export interface TokenPayload {
  user: {
    id: string;
  };
}

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
      };
    }
  }
}

if (!process.env.SESSION_JWT_SECRET) {
  throw new Error(
    "SESSION_JWT_SECRET must be defined as an environment variable"
  );
}

export const requireBearerAuth = (
  req: Request,
  _: Response,
  next: NextFunction
) => {
  try {
    let header = req.headers.authorization;

    if (!header) {
      throw new BadRequestError(
        "No Authorization header supplied with the request"
      );
    }

    let [type, token] = header.split(" ");

    if (type === "Bearer") {
      let { user } = jwt.verify(
        token,
        process.env.SESSION_JWT_SECRET!
      ) as TokenPayload;

      if (!user) {
        throw new BadRequestError(
          "Authorization payload does not contain user metadata"
        );
      }

      req.user = user;
    } else {
      throw new BadRequestError(`Authorization strategy ${type} not supported`);
    }
  } catch (err) {
    next(err);
  }

  next();
};
