import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

import type { Request, Response, NextFunction } from "express";

import { BadRequestError } from "../errors";

import { isTokenPayload } from "../validation";
import type { TokenPayload } from "../validation";

declare global {
  namespace Express {
    interface Request extends TokenPayload {}
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
      let { user } = jwt.verify(
        token,
        process.env.SESSION_JWT_SECRET!
      ) as TokenPayload & JwtPayload;

      if (!isTokenPayload(user)) {
        throw new BadRequestError(
          "Authorization payload contains incorrect or incomplete data"
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
