import { verify, TokenExpiredError } from "jsonwebtoken";

import type { Request, Response, NextFunction } from "express";

import { BadRequestError } from "../errors";

import { isAccessToken } from "../validations";
import type { UserPayload } from "../validations";

declare global {
  namespace Express {
    interface Request extends UserPayload {}
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
      try {
        let payload = verify(token, process.env.ACCESS_TOKEN_SECRET!);

        if (!isAccessToken(payload)) {
          throw new BadRequestError(
            "Authorization payload contains incorrect or incomplete data"
          );
        }

        req.user = payload.user;
      } catch (error) {
        if (error instanceof TokenExpiredError) {
          throw new BadRequestError(
            "The provided authorization token has expired"
          );
        }

        throw new BadRequestError(
          "The provided authorization token has failed verification checks"
        );
      }
    } else {
      throw new BadRequestError(`Authorization strategy ${type} not supported`);
    }
  } catch (err) {
    next(err);
  }

  next();
};
