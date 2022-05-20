import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

import type { Request, Response, NextFunction } from "express";

import { BadRequestError } from "../errors";

import { hasSessionPayload } from "../validations";
import type { SessionPayload } from "../validations";

declare global {
  namespace Express {
    interface Request extends SessionPayload {}
  }
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
      let payload = jwt.verify(
        token,
        process.env.SESSION_JWT_SECRET!
      ) as JwtPayload & SessionPayload;

      if (!hasSessionPayload(payload)) {
        throw new BadRequestError(
          "Authorization payload contains incorrect or incomplete data"
        );
      }

      req.user = payload.user;
    } else {
      throw new BadRequestError(`Authorization strategy ${type} not supported`);
    }
  } catch (err) {
    next(err);
  }

  next();
};
